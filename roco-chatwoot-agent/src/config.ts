export type Config = {
  host: string;
  port: number;
  chatwootBaseUrl: string;
  chatwootAccountId: number;
  chatwootInboxId: number;
  chatwootToken: string;
  webhookSecret: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiReasoningEffort: "none" | "low" | "medium" | "high" | "xhigh" | "max";
  confidenceThreshold: number;
  maxContextMessages: number;
  maxConcurrent: number;
  queueLimit: number;
  maxAttempts: number;
  retryBaseDelayMs: number;
  webhookMaxAgeSeconds: number;
};

const reasoningEfforts = ["none", "low", "medium", "high", "xhigh", "max"] as const;

function reasoningEffort(): Config["openaiReasoningEffort"] {
  const value = process.env.OPENAI_REASONING_EFFORT?.trim() || "low";
  if (!reasoningEfforts.includes(value as Config["openaiReasoningEffort"])) {
    throw new Error(`OPENAI_REASONING_EFFORT must be one of: ${reasoningEfforts.join(", ")}`);
  }
  return value as Config["openaiReasoningEffort"];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function decimal(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }
  return value;
}

function url(name: string, fallback?: string): string {
  const value = (process.env[name]?.trim() || fallback || "").replace(/\/$/, "");
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error(`${name} must use HTTPS`);
  return value;
}

export function loadConfig(): Config {
  return {
    host: process.env.HOST?.trim() || "127.0.0.1",
    port: integer("PORT", 3200, 1, 65_535),
    chatwootBaseUrl: url("CHATWOOT_BASE_URL", "https://support.rocobroker.com"),
    chatwootAccountId: integer("CHATWOOT_ACCOUNT_ID", 1, 1, Number.MAX_SAFE_INTEGER),
    chatwootInboxId: integer("CHATWOOT_INBOX_ID", 1, 1, Number.MAX_SAFE_INTEGER),
    chatwootToken: required("CHATWOOT_AGENT_BOT_TOKEN"),
    webhookSecret: required("CHATWOOT_WEBHOOK_SECRET"),
    openaiApiKey: required("OPENAI_API_KEY"),
    openaiBaseUrl: url("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
    openaiReasoningEffort: reasoningEffort(),
    confidenceThreshold: decimal("BOT_CONFIDENCE_THRESHOLD", 0.72, 0.5, 1),
    maxContextMessages: integer("BOT_MAX_CONTEXT_MESSAGES", 10, 1, 30),
    maxConcurrent: integer("AI_MAX_CONCURRENT", 2, 1, 20),
    queueLimit: integer("AI_QUEUE_LIMIT", 100, 1, 10_000),
    maxAttempts: integer("AI_MAX_ATTEMPTS", 3, 1, 5),
    retryBaseDelayMs: integer("AI_RETRY_BASE_DELAY_MS", 1_000, 100, 60_000),
    webhookMaxAgeSeconds: integer("WEBHOOK_MAX_AGE_SECONDS", 300, 30, 3_600),
  };
}
