import type { ChatwootMessage } from "./types.js";

export function isIncoming(message: ChatwootMessage): boolean {
  return message.message_type === "incoming" || message.message_type === 0;
}
export function isOutgoing(message: ChatwootMessage): boolean {
  return message.message_type === "outgoing" || message.message_type === 1;
}

export function buildConversation(messages: ChatwootMessage[], messageId: string, content: string) {
  const triggerId = Number(messageId);
  if (!Number.isSafeInteger(triggerId) || triggerId < 1) throw new Error("invalid_trigger_id");
  const preceding = messages.filter((message) => !message.private && Number(message.id) < triggerId &&
    typeof message.content === "string" && message.content.trim() && (isIncoming(message) || isOutgoing(message)))
    .sort((a, b) => Number(a.id) - Number(b.id));
  const transcript: Array<{ role: "customer" | "support"; content: string }> = preceding.map((message) => ({
    role: isIncoming(message) ? "customer" : "support", content: message.content!,
  }));
  transcript.push({ role: "customer", content });
  const lastSupport = [...preceding].reverse().find(isOutgoing);
  return {
    transcript,
    customerHistory: preceding.filter(isIncoming).map((message) => message.content!),
    isFirstTurn: preceding.length === 0,
    clarificationUsed: lastSupport?.content_attributes?.generated_by === "roco-chatwoot-agent" &&
      lastSupport.content_attributes.decision_action === "clarify",
  };
}
