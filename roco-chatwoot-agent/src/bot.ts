import type { Config } from "./config.js";
import { decideResponse } from "./openai.js";
import { getConversationMessages, handoff, sendMessage } from "./chatwoot.js";
import type { ChatwootMessage, ChatwootWebhook } from "./types.js";

const HUMAN_REQUEST = /\b(human|person|agent|representative|operator|support staff|live support)\b|انسان|اپراتور|پشتیبان|کارشناس|موظف|دعم بشري|человек|оператор|поддержк|mitarbeiter|berater|人工|客服/i;

function handoffText(message: string): string {
  if (/[؀-ۿ]/.test(message)) {
    return /[پچژگکی]/.test(message)
      ? "یک کارشناس پشتیبانی به‌زودی این گفتگو را ادامه می‌دهد."
      : "سيتابع أحد مختصي الدعم هذه المحادثة قريبًا."
  }
  if (/[Ѐ-ӿ]/.test(message)) return "Специалист поддержки скоро продолжит этот разговор.";
  if (/[一-鿿]/.test(message)) return "支持专员将很快继续此对话。";
  if (/\b(hallo|bitte|konto|mitarbeiter|berater|danke)\b/i.test(message)) {
    return "Ein Support-Mitarbeiter wird dieses Gespräch in Kürze fortsetzen.";
  }
  return "A support specialist will continue this conversation shortly.";
}

function isIncoming(message: ChatwootMessage): boolean {
  return message.message_type === "incoming" || message.message_type === 0;
}

function isOutgoing(message: ChatwootMessage): boolean {
  return message.message_type === "outgoing" || message.message_type === 1;
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
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  if (
    accountId !== config.chatwootAccountId ||
    inboxId !== config.chatwootInboxId ||
    !Number.isSafeInteger(conversationId) ||
    conversationId < 1 ||
    !messageId
  ) {
    return null;
  }

  // Once a human owns the conversation, the bot must stay out of the way.
  if (payload.conversation?.status === "open") return null;
  return { messageId, conversationId, contactId, content };
}

function transcript(messages: ChatwootMessage[], fallback: string) {
  const result: Array<{ role: "customer" | "support"; content: string }> = [];
  for (const message of messages) {
    if (message.private || typeof message.content !== "string" || !message.content.trim()) continue;
    if (isIncoming(message)) result.push({ role: "customer", content: message.content });
    else if (isOutgoing(message)) result.push({ role: "support", content: message.content });
  }
  return result.length ? result : [{ role: "customer" as const, content: fallback }];
}

export async function processMessage(
  config: Config,
  job: ReturnType<typeof webhookJob> & {},
): Promise<void> {
  const startedAt = Date.now();
  try {
    if (!job.content || HUMAN_REQUEST.test(job.content)) {
      await sendMessage(config, job.conversationId, handoffText(job.content));
      await handoff(config, job.conversationId);
      console.info(`[bot] message=${job.messageId} conversation=${job.conversationId} action=handoff reason=direct ms=${Date.now() - startedAt}`);
      return;
    }

    const messages = await getConversationMessages(config, job.conversationId);
    const decision = await decideResponse({
      config,
      contactId: job.contactId,
      messages: transcript(messages, job.content),
    });

    await sendMessage(config, job.conversationId, decision.message);
    if (decision.action === "handoff") await handoff(config, job.conversationId);
    console.info(
      `[bot] message=${job.messageId} conversation=${job.conversationId} action=${decision.action} reason=${decision.reason} confidence=${decision.confidence.toFixed(2)} ms=${Date.now() - startedAt}`,
    );
  } catch (error) {
    // Never log customer content or model output.
    console.error(
      `[bot] message=${job.messageId} conversation=${job.conversationId} outcome=failed:`,
      error instanceof Error ? error.message : "unknown error",
    );
    try {
      await sendMessage(config, job.conversationId, handoffText(job.content));
      await handoff(config, job.conversationId);
    } catch (handoffError) {
      console.error(
        `[bot] conversation=${job.conversationId} fallback_handoff=failed:`,
        handoffError instanceof Error ? handoffError.message : "unknown error",
      );
    }
  }
}
