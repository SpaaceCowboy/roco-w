import assert from "node:assert/strict";
import test from "node:test";
import { processMessage } from "./support.mjs";
import { getConversationMessages } from "../dist/chatwoot.js";
import { config, job, answer, incoming, vendorMock, withFetch } from "./support.mjs";

const sourceAttributes = (action = "reply") => ({ generated_by: "roco-chatwoot-agent", source_message_id: "42", decision_action: action });

test("first substantive question is sent with authoritative context and answered in Persian", async () => {
  const { state, fetch } = vendorMock();
  const phases = [];
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job(), (j) => phases.push(j.phase)), true));
  assert.equal(state.posts.length, 1);
  assert.match(state.posts[0].content, /پلتفرم/);
  assert.equal(state.posts[0].content_attributes.decision_action, "reply");
  assert.match(state.modelCalls[0].instructions, /IS_FIRST_TURN=true/);
  assert.match(state.modelCalls[0].instructions, /CUSTOMER_LANGUAGE=fa/);
  assert.deepEqual(JSON.parse(state.modelCalls[0].input).conversation, [{ role: "customer", content: job().content }]);
  assert.deepEqual(phases, ["reply_pending", "reply_delivered"]);
  assert.equal(state.toggles, 0);
});

test("wrong-language replies receive one retry, then confirmed localized handoff", async () => {
  const { state, fetch } = vendorMock({ decisions: [answer({ message: "ROCO provides MetaTrader 5." }), answer({ message: "ROCO provides MetaTrader 5." })] });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
  assert.equal(state.modelCalls.length, 2);
  assert.equal(state.toggles, 1);
  assert.equal(state.posts.length, 1);
  assert.match(state.posts[0].content, /گفتگو به تیم پشتیبانی منتقل شد/);
  assert.doesNotMatch(state.posts[0].content, /به‌زودی|باز نگه/);
  const toggleIndex = state.calls.findIndex((call) => call.path.endsWith("toggle_status"));
  const postIndex = state.calls.findIndex((call) => call.method === "POST" && call.path.endsWith("/messages"));
  assert.ok(toggleIndex < postIndex);
});

test("successful language correction replies without handoff", async () => {
  const { state, fetch } = vendorMock({ decisions: [answer({ message: "ROCO provides MetaTrader 5." }), answer()] });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
  assert.equal(state.modelCalls.length, 2);
  assert.equal(state.toggles, 0);
  assert.match(state.posts[0].content, /پلتفرم/);
});

test("human takeover during model work suppresses the bot's reply", async () => {
  const { state, fetch } = vendorMock({ onModel: (s) => { s.status = "open"; } });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
  assert.equal(state.posts.length, 0);
  assert.equal(state.toggles, 0);
});

test("pending conversation assigned to a human is ignored", async () => {
  const { state, fetch } = vendorMock({ assignee: { id: 5 } });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
  assert.equal(state.modelCalls.length, 0);
  assert.equal(state.posts.length, 0);
});

test("a failed transfer does not publish a claim and resumes from persisted intent", async () => {
  const current = job({ content: "حساب من محدود شده" });
  const { state, fetch } = vendorMock({ content: current.content, toggleFailures: 1 });
  const saved = [];
  await withFetch(fetch, async () => {
    assert.equal(await processMessage(config, current, (j) => saved.push({ ...j })), false);
    assert.equal(state.posts.length, 0);
    assert.equal(saved.at(-1).phase, "handoff_pending");
    const restored = { ...saved.at(-1), content: "", attempt: 2 };
    assert.equal(await processMessage(config, restored), true);
  });
  assert.equal(state.toggles, 2);
  assert.equal(state.status, "open");
  assert.equal(state.modelCalls.length, 0);
  assert.equal(state.posts.length, 1);
  assert.match(state.posts[0].content, /گفتگو/);
});

test("legacy handoff message does not hide an unfinished status transition", async () => {
  const { state, fetch } = vendorMock({ messages: [incoming(42, "حساب من محدود شده"),
    { id: 43, content: "legacy handoff", message_type: "outgoing", private: false,
      content_attributes: { generated_by: "roco-chatwoot-agent", source_message_id: "42" } }] });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
  assert.equal(state.status, "open");
  assert.equal(state.toggles, 1);
  assert.equal(state.posts.length, 0);
});

test("vendor success without status change remains a failed handoff", async () => {
  const { state, fetch } = vendorMock({ silentToggle: true });
  const current = job({ content: "اپراتور" });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, current), false));
  assert.equal(current.failureCode, "chatwoot_handoff_unconfirmed");
  assert.equal(state.posts.length, 0);
});

test("uncertain reply POST is reconciled on retry without duplicate or fallback", async () => {
  const current = job();
  const { state, fetch } = vendorMock({ losePostAcknowledgement: true });
  await withFetch(fetch, async () => {
    assert.equal(await processMessage(config, current), false);
    assert.equal(current.phase, "reply_pending");
    assert.equal(await processMessage(config, { ...current, content: "", attempt: 2 }), true);
  });
  assert.equal(state.posts.length, 1);
  assert.equal(state.modelCalls.length, 1);
  assert.equal(state.toggles, 0);
});

test("uncertain handoff message POST is reconciled after a restart", async () => {
  const current = job({ content: "اپراتور" });
  const { state, fetch } = vendorMock({ content: current.content, losePostAcknowledgement: true });
  await withFetch(fetch, async () => {
    assert.equal(await processMessage(config, current), false);
    assert.equal(current.phase, "handoff_confirmed");
    assert.equal(await processMessage(config, { ...current, content: "", attempt: 2 }), true);
  });
  assert.equal(state.toggles, 1);
  assert.equal(state.posts.length, 1);
  assert.equal(state.notes.length, 1);
});

test("one clarification is marked; another unclear response hands off after recovery", async () => {
  const clarification = { action: "clarify", reason: "clarification_needed", message: "دربارهٔ کدام نوع حساب سؤال دارید؟", confidence: 0.5, evidence: [] };
  const { state, fetch } = vendorMock({ decisions: [clarification, clarification] });
  await withFetch(fetch, async () => {
    assert.equal(await processMessage(config, job({ content: "در مورد حساب" })), true);
    assert.equal(state.posts[0].content_attributes.decision_action, "clarify");
    state.messages.push(incoming(44, "هنوز متوجه نشدم"));
    assert.equal(await processMessage(config, job({ messageId: "44", content: "" })), true);
  });
  assert.match(state.modelCalls[1].instructions, /CLARIFICATION_ALLOWED=false/);
  assert.equal(state.posts.at(-1).content_attributes.decision_action, "handoff");
  assert.equal(state.toggles, 1);
});

test("low confidence and invalid facts hand off without exposing model output", async () => {
  for (const decision of [answer({ confidence: 0.2 }), answer({ message: "BTC is supported.", evidence: ["BTC is currently supported for deposits."] }),
    answer({ message: "Register at https://unapproved.test" })]) {
    const { state, fetch } = vendorMock({ decisions: [decision] });
    await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
    assert.equal(state.toggles, 1);
    assert.doesNotMatch(state.posts[0].content, /BTC|unapproved/);
  }
});

test("AgentBot history uses conversation details without the forbidden messages index", async () => {
  const messages = Array.from({ length: 65 }, (_, index) => incoming(index + 1, "older message"));
  messages.push({ id: 43, message_type: "outgoing", content: "reply", content_attributes: sourceAttributes() });
  const { fetch } = vendorMock({ messages });
  await withFetch(fetch, async () => {
    const result = await getConversationMessages(config, 9, "42");
    assert.ok(result.find((message) => message.content_attributes?.source_message_id === "42"));
    assert.equal(result.length, 65);
  });
});

test("handoff decision made during human takeover does not post over the human", async () => {
  const { state, fetch } = vendorMock({
    onModel: (s) => { s.status = "open"; },
    decisions: [{ action: "handoff", reason: "unsupported_or_uncertain", confidence: 0.2, message: "unused", evidence: [] }],
  });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job()), true));
  assert.equal(state.posts.length, 0);
  assert.equal(state.notes.length, 0);
  assert.equal(state.toggles, 0);
});

test("greeting-only replies can introduce the AI without asking a product clarification", async () => {
  const introduction = "سلام، من دستیار هوش مصنوعی روکو هستم. چطور می‌توانم به شما کمک کنم؟";
  const { state, fetch } = vendorMock({ content: "سلام", decisions: [answer({ message: introduction, evidence: ["Company: Roco Broker LTD."] })] });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job({ content: "سلام" })), true));
  assert.equal(state.posts[0].content, introduction);
  assert.equal(state.posts[0].content_attributes.decision_action, "reply");
  assert.equal(state.toggles, 0);
});

test("later-turn first-message flag stays false even with a one-message model window", async () => {
  const { state, fetch } = vendorMock({ messages: [incoming(1, "سلام"), incoming(42, job().content)] });
  await withFetch(fetch, async () => assert.equal(await processMessage({ ...config, maxContextMessages: 1 }, job()), true));
  assert.equal(JSON.parse(state.modelCalls[0].input).conversation.length, 1);
  assert.match(state.modelCalls[0].instructions, /IS_FIRST_TURN=false/);
});

test("human-support postback inherits Persian context", async () => {
  const { state, fetch } = vendorMock({ messages: [incoming(1, "چه حساب‌هایی دارید؟"), incoming(42, "REQUEST_HUMAN_SUPPORT")] });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job({ content: "REQUEST_HUMAN_SUPPORT" })), true));
  assert.match(state.posts[0].content, /گفتگو به تیم پشتیبانی/);
  assert.equal(state.modelCalls.length, 0);
});

test("failure logs contain codes and IDs without vendor errors or customer/model text", async () => {
  const { fetch } = vendorMock();
  const logs = [];
  const originals = { info: console.info, error: console.error, warn: console.warn };
  for (const method of Object.keys(originals)) console[method] = (...values) => logs.push(values.join(" "));
  try {
    await withFetch(async (url, init) => {
      if (new URL(url).hostname === "model.test") throw new Error("synthetic-private-vendor-value");
      return fetch(url, init);
    }, async () => assert.equal(await processMessage(config, job({ content: "چه پلتفرمی دارید؟ synthetic-customer-text" })), true));
    assert.doesNotMatch(logs.join("\n"), /synthetic-private-vendor-value|synthetic-customer-text|چه پلتفرمی/);
    assert.match(logs.join("\n"), /correlation=42/);
    assert.match(logs.join("\n"), /code=model_network_error/);
  } finally {
    for (const method of Object.keys(originals)) console[method] = originals[method];
  }
});

test("a history window newer than an uncertain reply fails closed without reposting", async () => {
  const { state, fetch } = vendorMock({ messages: [incoming(100, "later message")] });
  const pending = job({ phase: "reply_pending", decisionAction: "reply" });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, pending), false));
  assert.equal(pending.failureCode, "chatwoot_history_unreconciled");
  assert.equal(pending.retryable, false);
  assert.equal(state.posts.length, 0);
  assert.equal(state.modelCalls.length, 0);
});

test("an old unfinished handoff completes even when its source marker has left recent history", async () => {
  const { state, fetch } = vendorMock({ messages: [incoming(100, "later message")] });
  await withFetch(fetch, async () => assert.equal(await processMessage(config,
    job({ phase: "handoff_pending", decisionAction: "handoff", reason: "human_requested" })), true));
  assert.equal(state.status, "open");
  assert.equal(state.posts.length, 0);
  assert.equal(state.toggles, 1);
});
