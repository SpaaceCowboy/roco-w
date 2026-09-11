import type { Config } from "./config.js";
import type { ChatwootMessage } from "./types.js";

type ConversationResponse = { messages?: ChatwootMessage[] };

async function chatwootRequest(
  config: Config,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${config.chatwootBaseUrl}${path}`, {
    ...init,
    headers: {
      api_access_token: config.chatwootToken,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Chatwoot API ${path} failed with HTTP ${response.status}`);
  return response;
}

export async function getConversationMessages(
  config: Config,
  conversationId: number,
): Promise<ChatwootMessage[]> {
  const response = await chatwootRequest(
    config,
    `/api/v1/accounts/${config.chatwootAccountId}/conversations/${conversationId}`,
  );
  const data = (await response.json()) as ConversationResponse;
  return data.messages ?? [];
}

export async function sendMessage(
  config: Config,
  conversationId: number,
  content: string,
  sourceMessageId?: string,
): Promise<void> {
  await chatwootRequest(
    config,
    `/api/v1/accounts/${config.chatwootAccountId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: content.slice(0, 4_000),
        message_type: "outgoing",
        private: false,
        content_type: "text",
        content_attributes: {
          generated_by: "roco-chatwoot-agent",
          ...(sourceMessageId ? { source_message_id: sourceMessageId } : {}),
        },
      }),
    },
  );
}

export async function handoff(config: Config, conversationId: number): Promise<void> {
  await chatwootRequest(
    config,
    `/api/v1/accounts/${config.chatwootAccountId}/conversations/${conversationId}/toggle_status`,
    { method: "POST", body: JSON.stringify({ status: "open" }) },
  );
}
