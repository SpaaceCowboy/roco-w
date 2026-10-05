import assert from "node:assert/strict";
import test from "node:test";
import { decideResponse } from "../dist/openai.js";

const config = {
  openaiApiKey: "test-key",
  openaiBaseUrl: "https://api.openai.test/v1",
  openaiModel: "gpt-5.4-mini",
  openaiReasoningEffort: "low",
  confidenceThreshold: 0.72,
  maxContextMessages: 10,
};

function modelResponse(decision, status = 200) {
  return new Response(JSON.stringify({ output_text: JSON.stringify(decision) }), { status });
}

test("accepts a supported model decision", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => modelResponse({
    action: "reply",
    message: "ROCO provides MetaTrader 5.",
    reason: "knowledge_answer",
    confidence: 0.96,
    evidence: ["ROCO provides MetaTrader 5 on desktop, web and mobile."],
  });
  try {
    const result = await decideResponse({
      config,
      contactId: "7",
      customerLanguage: "en",
      messages: [{ role: "customer", content: "Which platform do you support?" }],
    });
    assert.deepEqual(result, {
      action: "reply",
      message: "ROCO provides MetaTrader 5.",
      reason: "knowledge_answer",
      confidence: 0.96,
    evidence: ["ROCO provides MetaTrader 5 on desktop, web and mobile."],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("converts low-confidence model replies to handoff", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => modelResponse({
    action: "reply",
    message: "I think so.",
    reason: "knowledge_answer",
    confidence: 0.4,
    evidence: ["ROCO provides MetaTrader 5 on desktop, web and mobile."],
  });
  try {
    const result = await decideResponse({
      config,
      contactId: "7",
      customerLanguage: "en",
      messages: [{ role: "customer", content: "Is this symbol available?" }],
    });
    assert.equal(result.action, "handoff");
    assert.equal(result.reason, "unsupported_or_uncertain");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces model HTTP failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => modelResponse({ error: { message: "temporary failure" } }, 503);
  try {
    await assert.rejects(
      decideResponse({ config, contactId: "7", customerLanguage: "en", messages: [{ role: "customer", content: "Hello" }] }),
      /model_http_503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("passes authoritative first-turn, language and clarification state with configured threshold", async () => {
  const original = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, init) => {
    request = JSON.parse(init.body);
    return modelResponse({ action: "reply", reason: "knowledge_answer", message: "روکو پلتفرم MT5 را ارائه می‌کند.", confidence: 0.96,
      evidence: ["ROCO provides MetaTrader 5 on desktop, web and mobile."] });
  };
  try {
    await decideResponse({ config: { ...config, confidenceThreshold: 0.85 }, contactId: "7", customerLanguage: "fa",
      messages: [{ role: "customer", content: "چه پلتفرمی دارید؟" }], isFirstTurn: true, clarificationUsed: true });
    assert.match(request.instructions, /IS_FIRST_TURN=true/);
    assert.match(request.instructions, /CLARIFICATION_ALLOWED=false/);
    assert.match(request.instructions, /below 0\.85/);
    assert.doesNotMatch(request.instructions, /below 0\.72|\{\{CONFIDENCE_THRESHOLD\}\}/);
    assert.equal(request.store, false);
    assert.equal(request.prompt_cache_key, "roco-support-policy-v2");
  } finally { globalThis.fetch = original; }
});

test("rejects invalid action/reason combinations and invented or missing evidence", async () => {
  const original = globalThis.fetch;
  const base = { action: "reply", reason: "knowledge_answer", message: "ROCO provides MetaTrader 5.", confidence: 0.96,
    evidence: ["ROCO provides MetaTrader 5 on desktop, web and mobile."] };
  try {
    for (const decision of [{ ...base, reason: "financial_advice" }, { ...base, action: "handoff" },
      { ...base, action: "clarify", reason: "clarification_needed" }, { ...base, evidence: [] },
      { ...base, evidence: ["BTC is currently supported for deposits."] }]) {
      globalThis.fetch = async () => modelResponse(decision);
      await assert.rejects(decideResponse({ config, contactId: "7", customerLanguage: "en",
        messages: [{ role: "customer", content: "What payment methods are available?" }] }), /model_invalid_decision/);
    }
  } finally { globalThis.fetch = original; }
});

test("vendor error bodies are not retained in thrown errors or logs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: { message: "synthetic-private-vendor-value" } }, { status: 503 });
  try {
    await assert.rejects(decideResponse({ config, contactId: "7", customerLanguage: "en",
      messages: [{ role: "customer", content: "Hello" }] }), (error) => {
      assert.equal(error.code, "model_http_503");
      assert.doesNotMatch(error.message, /synthetic-private/);
      return true;
    });
  } finally { globalThis.fetch = original; }
});
