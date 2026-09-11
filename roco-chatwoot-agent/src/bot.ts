import type { Config } from "./config.js";
import { decideResponse } from "./openai.js";
import { addPrivateNote, getConversationMessages, handoff, sendMessage } from "./chatwoot.js";
import type { ChatwootMessage, ChatwootWebhook, DecisionReason, Job } from "./types.js";
import { responseMatchesCustomerLanguage } from "./language.js";
import { detectCustomerLanguage } from "./language.js";

const HUMAN_REQUEST = /\b(human|person|agent|representative|operator|support staff|live support)\b|انسان|اپراتور|پشتیبان|کارشناس|موظف|دعم بشري|человек|оператор|поддержк|mitarbeiter|berater|人工|客服/i;
const SENSITIVE_INFORMATION = /\b(password|passcode|otp|one[- ]?time code|2fa|seed phrase|private key|secret key|card number|cvv|wallet address)\b|رمز عبور|رمز یکبار مصرف|کد تأیید|عبارت بازیابی|کلید خصوصی|شماره کارت|کد امنیتی|مفتاح خاص|رمز|验证码|私钥|助记词|карта|пароль/i;
const ACCOUNT_OR_TRANSACTION = /\b(account balance|my account|account restriction|verify my|verification status|deposit|withdraw(?:al)?|payment|transaction|transfer|refund|trade|order|position|margin call|stop.?out|bonus claim)\b|موجودی|حساب من|احراز هویت|واریز|برداشت|پرداخت|تراکنش|انتقال|بازپرداخت|معامله|سفارش|پوزیشن|بونوس|رصيد|حسابي|إيداع|سحب|دفعة|معاملة|تحويل|استرداد|تجارة|طلب|رصيد الهامش|余额|账户|充值|提现|付款|交易|退款|订单|余额|сч[её]т|депозит|вывод|плат[её]ж|транзакц|сделк|ордер/i;
const COMPLAINT_OR_LEGAL = /\b(complaint|complain|scam|fraud|stolen|lawsuit|lawyer|legal|regulator|regulatory|chargeback|dispute)\b|شکایت|کلاهبرداری|تقلب|سرقت|وکیل|حقوقی|رگولاتور|اعتراض|شكوى|احتيال|سرقة|محام|قانوني|منظم|اعتراض|投诉|欺诈|盗窃|律师|法律|监管|жалоб|мошеннич|украд|юрист|юридич/i;
const FINANCIAL_ADVICE = /\b(should i|recommend|advise me|best leverage|which (account|provider|trade|symbol)|buy|sell|invest|guaranteed profit|signal|allocation|risk)\b|آیا.*(بخرم|بفروشم|سرمایه‌گذاری)|اهرم.*(پیشنهاد|مناسب)|سود تضمینی|توصیه مالی|هل أشتري|هل أبيع|استثمر|رافعة مناسبة|شراء|بيع|投资|买入|卖出|推荐|杠杆|гарантированн.*прибыл|купить|продать|инвест/i;
const PROMPT_INJECTION = /\b(ignore|disregard|forget|override|bypass|reveal|show|print|repeat).{0,40}\b(previous|prior|system|developer|hidden|secret|instruction|prompt|policy)\b|ignore (all|any) (previous|prior) instructions|سیستم پرامپت|دستورهای قبلی|محرمانه|تعليمات السابقة|التعليمات السابقة|系统提示词|忽略之前的指令|предыдущие инструкции/i;

export function deterministicHandoffReason(message: string): DecisionReason | null {
  if (HUMAN_REQUEST.test(message)) return "human_requested";
  if (SENSITIVE_INFORMATION.test(message)) return "sensitive_information";
  if (COMPLAINT_OR_LEGAL.test(message)) return "complaint_or_legal";
  if (FINANCIAL_ADVICE.test(message)) return "financial_advice";
  if (PROMPT_INJECTION.test(message)) return "unsupported_or_uncertain";
  if (ACCOUNT_OR_TRANSACTION.test(message)) return "needs_account_access";
  return null;
}

function handoffText(message: string, reason?: DecisionReason): string {
  const safety = reason === "sensitive_information";
  if (/[؀-ۿ]/.test(message)) {
    if (/[پچژگکی]/.test(message)) {
      return safety
        ? "یک کارشناس پشتیبانی به‌زودی این گفتگو را ادامه می‌دهد. لطفاً رمز عبور، کد یک‌بارمصرف، اطلاعات کارت یا کلید خصوصی خود را ارسال نکنید."
        : "یک کارشناس پشتیبانی به‌زودی این گفتگو را ادامه می‌دهد. لطفاً اطلاعات مرتبط با مشکل را بدون رمز عبور یا کد تأیید ارسال کنید."
    }
    return safety
      ? "سيتابع أحد مختصي الدعم هذه المحادثة قريبًا. يُرجى عدم إرسال كلمة المرور أو رمز التحقق أو بيانات البطاقة أو المفتاح الخاص."
      : "سيتابع أحد مختصي الدعم هذه المحادثة قريبًا. يُرجى إرسال تفاصيل المشكلة دون كلمة مرور أو رمز تحقق."
  }
  if (/[Ѐ-ӿ]/.test(message)) return safety
    ? "Специалист поддержки скоро продолжит этот разговор. Не отправляйте пароль, код подтверждения, данные карты или закрытый ключ."
    : "Специалист поддержки скоро продолжит этот разговор. Не отправляйте пароль или код подтверждения.";
  if (/[一-鿿]/.test(message)) return safety
    ? "支持专员将很快继续此对话。请勿发送密码、验证码、银行卡信息、助记词或私钥。"
    : "支持专员将很快继续此对话。请不要发送密码或验证码。";
  if (/\b(hallo|bitte|konto|mitarbeiter|berater|danke)\b/i.test(message)) {
    return safety
      ? "Ein Support-Mitarbeiter wird dieses Gespräch in Kürze fortsetzen. Bitte senden Sie niemals Passwörter, Bestätigungscodes, Kartendaten oder private Schlüssel."
      : "Ein Support-Mitarbeiter wird dieses Gespräch in Kürze fortsetzen. Bitte senden Sie kein Passwort oder keinen Bestätigungscode.";
  }
  return safety
    ? "A support specialist will continue this conversation shortly. Never send passwords, OTPs, card details, seed phrases, or private keys."
    : "A support specialist will continue this conversation shortly. Please do not send passwords or verification codes.";
}

function isIncoming(message: ChatwootMessage): boolean {
  return message.message_type === "incoming" || message.message_type === 0;
}

function isOutgoing(message: ChatwootMessage): boolean {
  return message.message_type === "outgoing" || message.message_type === 1;
}

async function recordHandoff(config: Config, conversationId: number, message: string, reason: DecisionReason): Promise<void> {
  try {
    await addPrivateNote(config, conversationId, `AI handoff\nReason: ${reason}\nCustomer language: ${detectCustomerLanguage(message)}\nAction: human review required`);
  } catch (error) {
    console.error(`[bot] conversation=${conversationId} private_note=failed:`, error instanceof Error ? error.message : "unknown error");
  }
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
  job: Job,
): Promise<boolean> {
  const startedAt = Date.now();
  try {
    const messages = await getConversationMessages(config, job.conversationId);
    if (messages.some((message) => {
      const attributes = message.content_attributes;
      return attributes?.generated_by === "roco-chatwoot-agent" && attributes.source_message_id === job.messageId;
    })) {
      console.info(`[bot] message=${job.messageId} conversation=${job.conversationId} action=skip reason=already_processed ms=${Date.now() - startedAt}`);
      return true;
    }

    const content = job.content || messages.find((message) => String(message.id) === job.messageId)?.content?.trim() || "";
    const forcedReason = deterministicHandoffReason(content);
    if (!content || forcedReason) {
      await recordHandoff(config, job.conversationId, content, forcedReason ?? "unsupported_or_uncertain");
      await sendMessage(config, job.conversationId, handoffText(content, forcedReason ?? undefined), job.messageId);
      await handoff(config, job.conversationId);
      console.info(`[bot] message=${job.messageId} conversation=${job.conversationId} action=handoff reason=${forcedReason ?? "unsupported_or_uncertain"} ms=${Date.now() - startedAt}`);
      return true;
    }

    const decision = await decideResponse({
      config,
      contactId: job.contactId,
      messages: transcript(messages, content),
    });

    if (decision.action === "handoff" || !responseMatchesCustomerLanguage(content, decision.message)) {
      await recordHandoff(config, job.conversationId, content, decision.action === "handoff" ? decision.reason : "unsupported_or_uncertain");
      await sendMessage(config, job.conversationId, handoffText(content, decision.reason), job.messageId);
      await handoff(config, job.conversationId);
      console.info(`[bot] message=${job.messageId} conversation=${job.conversationId} action=handoff reason=${decision.action === "handoff" ? decision.reason : "unsupported_or_uncertain"} ms=${Date.now() - startedAt}`);
      return true;
    }

    await sendMessage(config, job.conversationId, decision.message, job.messageId);
    console.info(
      `[bot] message=${job.messageId} conversation=${job.conversationId} action=${decision.action} reason=${decision.reason} confidence=${decision.confidence.toFixed(2)} ms=${Date.now() - startedAt}`,
    );
    return true;
  } catch (error) {
    // Never log customer content or model output.
    console.error(
      `[bot] message=${job.messageId} conversation=${job.conversationId} outcome=failed:`,
      error instanceof Error ? error.message : "unknown error",
    );
    try {
      await recordHandoff(config, job.conversationId, job.content, "unsupported_or_uncertain");
      await sendMessage(config, job.conversationId, handoffText(job.content, "unsupported_or_uncertain"), job.messageId);
      await handoff(config, job.conversationId);
    } catch (handoffError) {
      console.error(
        `[bot] conversation=${job.conversationId} fallback_handoff=failed:`,
        handoffError instanceof Error ? handoffError.message : "unknown error",
      );
    }
    return false;
  }
}
