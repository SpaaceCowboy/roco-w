import type { Config } from "./config.js";
import { SYSTEM_POLICY } from "./knowledge.js";
import { decisionReasons, type BotDecision } from "./types.js";
import { redactForModel, safetyIdentifier } from "./security.js";

type ResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["reply", "handoff"] },
    message: { type: "string", minLength: 1, maxLength: 1_200 },
    reason: { type: "string", enum: decisionReasons },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["action", "message", "reason", "confidence"],
} as const;

function outputText(payload: ResponsePayload): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("The model response contained no output text");
}

function isDecision(value: unknown): value is BotDecision {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BotDecision>;
  return (
    (item.action === "reply" || item.action === "handoff") &&
    typeof item.message === "string" &&
    item.message.trim().length > 0 &&
    item.message.length <= 1_200 &&
    typeof item.confidence === "number" &&
    item.confidence >= 0 &&
    item.confidence <= 1 &&
    decisionReasons.includes(item.reason as (typeof decisionReasons)[number])
  );
}

export async function decideResponse({
  config,
  contactId,
  messages,
}: {
  config: Config;
  contactId: string;
  messages: Array<{ role: "customer" | "support"; content: string }>;
}): Promise<BotDecision> {
  const transcript = messages
    .slice(-config.maxContextMessages)
    .map((message) => `${message.role.toUpperCase()}: ${redactForModel(message.content)}`)
    .join("\n");

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${config.openaiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openaiModel,
      instructions: SYSTEM_POLICY,
      input: `Decide how to handle the newest customer message.\n\nCONVERSATION:\n${transcript}`,
      reasoning: { effort: config.openaiReasoningEffort },
      text: {
        format: {
          type: "json_schema",
          name: "roco_support_decision",
          strict: true,
          schema: DECISION_SCHEMA,
        },
      },
      max_output_tokens: 500,
      store: false,
      prompt_cache_key: "roco-support-policy-v1",
      safety_identifier: safetyIdentifier(contactId),
    }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error(`[openai] model=${config.openaiModel} status=network_error latency_ms=${Date.now() - startedAt}`);
    throw error;
  }
  console.info(`[openai] model=${config.openaiModel} status=${response.status} latency_ms=${Date.now() - startedAt}`);

  const payload = (await response.json()) as ResponsePayload;
  if (!response.ok) {
    throw new Error(`Model request failed with HTTP ${response.status}: ${payload.error?.message ?? "unknown error"}`);
  }

  const parsed: unknown = JSON.parse(outputText(payload));
  if (!isDecision(parsed)) throw new Error("Model returned an invalid support decision");

  if (parsed.action === "reply" && parsed.confidence < config.confidenceThreshold) {
    return {
      action: "handoff",
      message: "A support specialist will continue this conversation shortly.",
      reason: "unsupported_or_uncertain",
      confidence: parsed.confidence,
    };
  }

  return { ...parsed, message: parsed.message.trim() };
}
