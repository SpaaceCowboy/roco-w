import assert from "node:assert/strict";
import test from "node:test";
import { webhookJob } from "../dist/bot.js";

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
