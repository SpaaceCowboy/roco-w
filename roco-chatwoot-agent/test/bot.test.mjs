import assert from "node:assert/strict";
import test from "node:test";
import { deterministicHandoffReason, webhookJob } from "../dist/bot.js";

const config = {
  chatwootAccountId: 1,
  chatwootInboxId: 1,
};

test("accepts only an incoming contact message for the configured inbox", () => {
  const payload = {
    event: "message_created",
    id: 42,
    content: "What account types do you offer?",
    message_type: "incoming",
    sender_type: "Contact",
    account: { id: 1 },
    inbox: { id: 1 },
    contact: { id: 7 },
    conversation: { id: 9, inbox_id: 1, status: "pending" },
  };
  assert.deepEqual(webhookJob(payload, config), {
    messageId: "42",
    conversationId: 9,
    contactId: "7",
    content: "What account types do you offer?",
  });
  assert.equal(webhookJob({ ...payload, message_type: "outgoing" }, config), null);
  assert.equal(webhookJob({ ...payload, inbox: { id: 2 } }, config), null);
  assert.equal(webhookJob({ ...payload, conversation: { ...payload.conversation, status: "open" } }, config), null);
});

test("forces high-risk requests to handoff before model processing", () => {
  assert.equal(deterministicHandoffReason("I forgot my password and need an OTP"), "sensitive_information");
  assert.equal(deterministicHandoffReason("Why was my withdrawal rejected?"), "needs_account_access");
  assert.equal(deterministicHandoffReason("I want to file a complaint"), "complaint_or_legal");
  assert.equal(deterministicHandoffReason("Should I use 1:1000 leverage?"), "financial_advice");
  assert.equal(deterministicHandoffReason("Please connect me to a human"), "human_requested");
  assert.equal(deterministicHandoffReason("What platforms do you support?"), null);
});
