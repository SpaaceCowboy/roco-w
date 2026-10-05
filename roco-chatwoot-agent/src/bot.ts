import type { Config } from "./config.js";
import { decideResponse } from "./openai.js";
import { addPrivateNote, getConversation, getConversationMessages, handoff, humanOwnsConversation, sendMessage } from "./chatwoot.js";
import type { ChatwootMessage, ChatwootWebhook, DecisionReason, Job } from "./types.js";
import { handoffText, offlineText, resolveCustomerLanguage, responseMatchesLanguage } from "./language.js";
import { buildConversation, isIncoming, isOutgoing } from "./conversation.js";
import { deterministicHandoffReason } from "./routing.js";
import { errorCode, ServiceError } from "./errors.js";
import { isBotAvailable } from "./availability.js";
import { metrics } from "./metrics.js";
export { deterministicHandoffReason } from "./routing.js";

function interactivePayload(payload: ChatwootWebhook): string {
  const attributes = payload.content_attributes;
  if (!attributes) return "";

  const submitted = attributes.submitted_values;
  if (submitted && typeof submitted === "object") {
    const value = (submitted as { value?: unknown }).value;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const value = attributes.payload;
  return typeof value === "string" ? value.trim() : "";
}

export function webhookJob(payload: ChatwootWebhook, config: Config): {
  messageId: string;
  conversationId: number;
  contactId: string;
  content: string;
} | null {
  if (payload.event !== "message_created" || !isIncoming(payload) || payload.private === true) return null;
  if (payload.sender_type && payload.sender_type !== "Contact") return null;
  if (payload.sender?.type && payload.sender.type.toLowerCase() !== "contact") return null;

  const accountId = Number(payload.account?.id);
  const inboxId = Number(payload.inbox?.id ?? payload.conversation?.inbox_id);
  const conversationId = Number(payload.conversation?.id);
  const messageId = String(payload.id ?? "");
  const contactId = String(payload.contact?.id ?? payload.sender?.id ?? "unknown");
  const content = typeof payload.content === "string" && payload.content.trim()
    ? payload.content.trim()
    : interactivePayload(payload);

  if (
    accountId !== config.chatwootAccountId ||
    inboxId !== config.chatwootInboxId ||
    !Number.isSafeInteger(conversationId) ||
    conversationId < 1 ||
    !/^(?:[0-9]+|unknown)$/.test(contactId) ||
    !Number.isSafeInteger(Number(messageId)) || Number(messageId) < 1
  ) {
    return null;
  }

  // Once a human owns the conversation, the bot must stay out of the way.
  if (payload.conversation?.status === "open") return null;
  return { messageId, conversationId, contactId, content };
}

function sourceReply(messages: ChatwootMessage[], messageId: string): ChatwootMessage | undefined {
  return messages.find((message) => !message.private && isOutgoing(message) &&
    message.content_attributes?.generated_by === "roco-chatwoot-agent" &&
    String(message.content_attributes.source_message_id) === messageId);
}

function humanHasReplied(messages: ChatwootMessage[], messageId: string): boolean {
  return messages.some((message) => !message.private && isOutgoing(message) && Number(message.id) > Number(messageId) &&
    message.content_attributes?.generated_by !== "roco-chatwoot-agent");
}

export async function processMessage(config: Config, job: Job, persist: (job: Job) => void = () => {}, now: () => Date = () => new Date()): Promise<boolean> {
  const startedAt = Date.now();
  const save = (patch: Partial<Job>) => { Object.assign(job, patch); persist(job); };
  const log = `[bot] message=${job.messageId} conversation=${job.conversationId}`;
  try {
    const conversationStatus = await getConversation(config, job.conversationId, job.messageId);
    const resumingHandoff = job.decisionAction === "handoff" || job.phase === "handoff_pending" || job.phase === "handoff_confirmed";
    if (humanOwnsConversation(conversationStatus) && !resumingHandoff) {
      console.info(`${log} action=skip reason=human_owned`);
      return true;
    }
    const messages = await getConversationMessages(config, job.conversationId, job.messageId);
    const delivered = sourceReply(messages, job.messageId);
    const historyAfterTrigger = (history: ChatwootMessage[]) => history.length > 0 &&
      history.every((message) => Number(message.id) > Number(job.messageId));
    // A recent-history window cannot reconcile an older uncertain send safely.
    if (!resumingHandoff && !delivered && job.phase !== "reply_delivered" && historyAfterTrigger(messages)) {
      throw new ServiceError("chatwoot_history_unreconciled", false);
    }
    const content = job.content || messages.find((message) => String(message.id) === job.messageId)?.content?.trim() || "";
    const context = buildConversation(messages, job.messageId, content);
    const language = job.language ?? resolveCustomerLanguage(content, context.customerHistory);

    const outsideHours = () => job.outsideHours === true || !isBotAvailable(config.availability, now());

    async function transfer(reason: DecisionReason | "outside_bot_hours"): Promise<boolean> {
      const alreadyRequested = job.decisionAction === "handoff";
      // Save transfer intent before the status mutation, independently of reply delivery.
      save({ decisionAction: "handoff", reason, language, phase: "handoff_pending",
        outsideHours: job.outsideHours === true || !isBotAvailable(config.availability, now()) });
      try {
        const current = await getConversation(config, job.conversationId, job.messageId);
        if (current.status === "resolved" || current.status === "snoozed") return true;
        if (humanOwnsConversation(current) && !alreadyRequested) return true;
        if (current.status !== "open") await handoff(config, job.conversationId, job.messageId);
        save({ phase: "handoff_confirmed" });
      } catch (error) {
        metrics.handoff_failures += 1;
        throw error;
      }
      // Confirm transfer before claiming it happened; reconcile uncertain POSTs.
      const freshMessages = await getConversationMessages(config, job.conversationId, job.messageId);
      if ((!job.outsideHours || config.availability.outsideHours === "message_handoff") && !historyAfterTrigger(freshMessages) && !sourceReply(freshMessages, job.messageId) && !humanHasReplied(freshMessages, job.messageId)) {
        if ((await getConversation(config, job.conversationId, job.messageId)).status !== "open") return true;
        const text = handoffText(language, reason === "sensitive_information");
        await sendMessage(config, job.conversationId, job.outsideHours && !isBotAvailable(config.availability, now()) ? `${offlineText(language)} ${text}` : text, job.messageId,
          { decision_action: "handoff", decision_reason: reason, customer_language: language });
      }
      // Notes contain metadata only. Note failure cannot undo a confirmed transfer.
      if (!freshMessages.some((message) => message.private && message.content_attributes?.type === "handoff_context" &&
        String(message.content_attributes.source_message_id) === job.messageId)) {
        try {
          await addPrivateNote(config, job.conversationId,
            `AI handoff\nReason: ${reason}\nCustomer language: ${language}\nAction: human review required`, job.messageId);
        } catch (error) {
          console.error(`${log} private_note=failed code=${errorCode(error)}`);
        }
      }
      save({ phase: "reply_delivered" });
      metrics.handoffs += 1;
      console.info(`${log} action=handoff reason=${reason} language=${language} ms=${Date.now() - startedAt}`);
      return true;
    }

    // Legacy replies lacked an action marker. On pending conversations finish a
    // conservative human transfer instead of silently abandoning a failed handoff.
    const markerAction = delivered?.content_attributes?.decision_action;
    if (resumingHandoff || markerAction === "handoff" || (delivered && markerAction === undefined)) {
      return await transfer(job.reason ?? "unsupported_or_uncertain");
    }
    if (delivered || job.phase === "reply_delivered") {
      console.info(`${log} action=skip reason=already_processed`);
      return true;
    }
    if (humanHasReplied(messages, job.messageId)) return true;
    const forcedReason = deterministicHandoffReason(content);
    if (!content || forcedReason) return await transfer(forcedReason ?? "unsupported_or_uncertain");

    if (outsideHours()) return await transfer("outside_bot_hours");

    let decision;
    try {
      decision = await decideResponse({ config, contactId: job.contactId, messages: context.transcript,
        customerLanguage: language, isFirstTurn: context.isFirstTurn, clarificationUsed: context.clarificationUsed,
        correlationId: job.messageId });
      if (decision.action !== "handoff" && !responseMatchesLanguage(language, decision.message)) {
        if (outsideHours()) return await transfer("outside_bot_hours");
        metrics.language_retries += 1;
        console.warn(`${log} action=language_retry language=${language}`);
        decision = await decideResponse({ config, contactId: job.contactId, messages: context.transcript,
          customerLanguage: language, isFirstTurn: context.isFirstTurn, clarificationUsed: context.clarificationUsed,
          requireLanguageOnly: true, correlationId: job.messageId });
      }
    } catch (error) {
      console.error(`${log} model=failed code=${errorCode(error)}`);
      return await transfer("unsupported_or_uncertain");
    }
    if (outsideHours()) return await transfer("outside_bot_hours");
    if (decision.action === "handoff") return await transfer(decision.reason);
    if (!responseMatchesLanguage(language, decision.message)) return await transfer("unsupported_or_uncertain");

    if (humanOwnsConversation(await getConversation(config, job.conversationId, job.messageId))) return true;
    const freshMessages = await getConversationMessages(config, job.conversationId, job.messageId);
    if (sourceReply(freshMessages, job.messageId) || humanHasReplied(freshMessages, job.messageId)) return true;
    // Chatwoot has no conditional-send primitive; minimize the takeover race.
    if (humanOwnsConversation(await getConversation(config, job.conversationId, job.messageId))) return true;
    if (outsideHours()) return await transfer("outside_bot_hours");
    save({ phase: "reply_pending", decisionAction: decision.action, reason: decision.reason, language });
    await sendMessage(config, job.conversationId, decision.message, job.messageId,
      { decision_action: decision.action, decision_reason: decision.reason, customer_language: language });
    save({ phase: "reply_delivered" });
    if (decision.action === "clarify") metrics.clarifications += 1;
    console.info(`${log} action=${decision.action} reason=${decision.reason} language=${language} confidence=${decision.confidence.toFixed(2)} ms=${Date.now() - startedAt}`);
    return true;
  } catch (error) {
    // Never post a second fallback after an uncertain POST. Retry reconciles the marker.
    console.error(`${log} outcome=failed code=${errorCode(error)} ms=${Date.now() - startedAt}`);
    job.failureCode = errorCode(error);
    job.retryable = !(error instanceof ServiceError) || error.retryable;
    return false;
  }
}
