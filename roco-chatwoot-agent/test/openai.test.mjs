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
  });
  try {
    const result = await decideResponse({
      config,
      contactId: "7",
      messages: [{ role: "customer", content: "Which platform do you support?" }],
    });
    assert.deepEqual(result, {
      action: "reply",
      message: "ROCO provides MetaTrader 5.",
      reason: "knowledge_answer",
      confidence: 0.96,
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
  });
  try {
    const result = await decideResponse({
      config,
      contactId: "7",
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
      decideResponse({ config, contactId: "7", messages: [{ role: "customer", content: "Hello" }] }),
      /Model request failed with HTTP 503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
