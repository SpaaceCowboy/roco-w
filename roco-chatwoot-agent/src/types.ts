export type ChatwootMessage = {
  id?: number | string;
  content?: string | null;
  message_type?: "incoming" | "outgoing" | "activity" | "template" | number;
  private?: boolean;
  sender_type?: string | null;
  sender?: { id?: number | string; type?: string; name?: string } | null;
  content_attributes?: Record<string, unknown> | null;
};

export type Job = {
  messageId: string;
  conversationId: number;
  contactId: string;
  content: string;
  attempt: number;
};

export type ChatwootWebhook = ChatwootMessage & {
  event?: string;
  account?: { id?: number | string };
  inbox?: { id?: number | string };
  contact?: { id?: number | string };
  conversation?: {
    id?: number | string;
    display_id?: number | string;
    inbox_id?: number | string;
    status?: string;
  };
};

export const decisionReasons = [
  "knowledge_answer",
  "needs_account_access",
  "financial_advice",
  "complaint_or_legal",
  "sensitive_information",
  "human_requested",
  "unsupported_or_uncertain",
] as const;

export type DecisionReason = (typeof decisionReasons)[number];

export type BotDecision = {
  action: "reply" | "handoff";
  message: string;
  reason: DecisionReason;
  confidence: number;
};
