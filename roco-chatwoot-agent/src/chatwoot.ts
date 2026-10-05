import type { Config } from "./config.js";
import type { ChatwootMessage } from "./types.js";
import { errorCode, ServiceError } from "./errors.js";

export type Conversation = {
  status: "pending" | "open" | "resolved" | "snoozed";
  meta?: { assignee?: { id?: number } | null };
};

type RequestContext = { correlationId?: string | undefined };

async function chatwootRequest(config: Config, conversationId: number, operation: string,
  suffix = "", init: RequestInit = {}, context: RequestContext = {}): Promise<Response> {
  const startedAt = Date.now();
  let response: Response;
  const log = `[chatwoot] conversation=${conversationId} correlation=${context.correlationId ?? "none"} operation=${operation}`;
  try {
    response = await fetch(`${config.chatwootBaseUrl}/api/v1/accounts/${config.chatwootAccountId}/conversations/${conversationId}${suffix}`, {
      ...init,
      headers: { api_access_token: config.chatwootToken, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error(`${log} status=network_error code=${errorCode(error)} latency_ms=${Date.now() - startedAt}`);
    throw new ServiceError("chatwoot_network_error");
  }
  console.info(`${log} status=${response.status} latency_ms=${Date.now() - startedAt}`);
  if (!response.ok) throw new ServiceError(`chatwoot_http_${response.status}`,
    response.status === 408 || response.status === 429 || response.status >= 500);
  return response;
}

export async function getConversation(config: Config, conversationId: number, correlationId?: string): Promise<Conversation> {
  const response = await chatwootRequest(config, conversationId, "read_conversation", "", {}, { correlationId });
  const data = await response.json() as Conversation;
  if (!["pending", "open", "resolved", "snoozed"].includes(data.status)) throw new ServiceError("chatwoot_invalid_status");
  return data;
}

export function humanOwnsConversation(conversation: Conversation): boolean {
  return conversation.status !== "pending" || conversation.meta?.assignee?.id != null;
}

/** AgentBot tokens can read the conversation detail, but cannot GET /messages.
 * Chatwoot returns a bounded recent history here; never claim full pagination.
 */
export async function getConversationMessages(config: Config, conversationId: number, correlationId?: string): Promise<ChatwootMessage[]> {
  const response = await chatwootRequest(config, conversationId, "read_history", "", {}, { correlationId });
  const data = await response.json() as { messages?: ChatwootMessage[] };
  if (!Array.isArray(data.messages)) throw new ServiceError("chatwoot_invalid_messages");
  if (data.messages.some((message) => !Number.isSafeInteger(Number(message.id)) || Number(message.id) < 1)) {
    throw new ServiceError("chatwoot_invalid_message_id");
  }
  return [...new Map(data.messages.map((message) => [String(message.id), message])).values()];
}

export async function sendMessage(config: Config, conversationId: number, content: string,
  sourceMessageId: string, attributes: Record<string, unknown> = {}): Promise<void> {
  const response = await chatwootRequest(config, conversationId, "post_reply", "/messages", {
    method: "POST",
    body: JSON.stringify({ content: content.slice(0, 4_000), message_type: "outgoing", private: false, content_type: "text",
      content_attributes: { ...attributes, generated_by: "roco-chatwoot-agent", source_message_id: sourceMessageId } }),
  }, { correlationId: sourceMessageId });
  const data = await response.json() as { id?: number | string; status?: string };
  if (!data.id || data.status === "failed") throw new ServiceError("chatwoot_reply_unconfirmed");
}

export async function addPrivateNote(config: Config, conversationId: number, content: string, sourceMessageId: string): Promise<void> {
  await chatwootRequest(config, conversationId, "post_handoff_note", "/messages", {
    method: "POST",
    body: JSON.stringify({ content: content.slice(0, 2_000), message_type: "outgoing", private: true, content_type: "text",
      content_attributes: { generated_by: "roco-chatwoot-agent", type: "handoff_context", source_message_id: sourceMessageId } }),
  }, { correlationId: sourceMessageId });
}

export async function handoff(config: Config, conversationId: number, correlationId?: string): Promise<void> {
  const response = await chatwootRequest(config, conversationId, "set_open", "/toggle_status", {
    method: "POST", body: JSON.stringify({ status: "open" }),
  }, { correlationId });
  // Chatwoot versions use top-level or payload.current_status. Check both,
  // then read back the conversation to catch success-without-outcome failures.
  const data = await response.json() as { current_status?: string; payload?: { current_status?: string } };
  const returnedStatus = data.payload?.current_status ?? data.current_status;
  if (returnedStatus !== undefined && returnedStatus !== "open") throw new ServiceError("chatwoot_handoff_unconfirmed");
  if ((await getConversation(config, conversationId, correlationId)).status !== "open") {
    throw new ServiceError("chatwoot_handoff_unconfirmed");
  }
}
