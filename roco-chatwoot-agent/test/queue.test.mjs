import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JobStore } from "../dist/store.js";
import { JobQueue } from "../dist/queue.js";
import { config, job } from "./support.mjs";

async function until(predicate) {
  const expires = Date.now() + 2_000;
  while (!predicate()) {
    if (Date.now() > expires) throw new Error("synthetic queue timeout");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
function temporary(t) {
  const dir = mkdtempSync(join(tmpdir(), "roco-bot-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, "jobs.json");
}

test("legacy jobs load; phases persist without customer content; terminal jobs stay terminal", (t) => {
  const path = temporary(t);
  writeFileSync(path, JSON.stringify([{ messageId: "42", conversationId: 9, contactId: "7", attempt: 1 },
    { messageId: "43", conversationId: 9, contactId: "7", attempt: 3 }]));
  const store = new JobStore(path, 3);
  assert.equal(store.pending().length, 1);
  assert.equal(store.failedCount(), 1);
  store.update(job({ phase: "handoff_pending", decisionAction: "handoff", language: "fa", reason: "needs_account_access", content: "synthetic-private-content" }));
  assert.doesNotMatch(readFileSync(path, "utf8"), /synthetic-private-content|content/);
  const restored = new JobStore(path);
  assert.equal(restored.pending()[0].phase, "handoff_pending");
  assert.equal(restored.failedCount(), 1);
});

test("retry backoff blocks later jobs only in the same conversation", async (t) => {
  const store = new JobStore(temporary(t));
  const calls = [];
  const queue = new JobQueue({ ...config, retryBaseDelayMs: 40 }, store, async (_config, current) => {
    calls.push(`${current.messageId}:${current.attempt}`);
    return current.messageId !== "42" || current.attempt > 1;
  });
  t.after(() => queue.stop());
  queue.enqueue(job());
  queue.enqueue(job({ messageId: "43" }));
  queue.enqueue(job({ messageId: "44", conversationId: 10 }));
  await until(() => store.pending().length === 0);
  assert.ok(calls.indexOf("42:2") < calls.indexOf("43:1"), calls.join(","));
  assert.ok(calls.indexOf("44:1") < calls.indexOf("42:2"), calls.join(","));
});

test("retry exhaustion persists and does not run again after restarting", async (t) => {
  const path = temporary(t);
  const store = new JobStore(path);
  let calls = 0;
  const queue = new JobQueue(config, store, async () => { calls += 1; return false; });
  t.after(() => queue.stop());
  queue.enqueue(job());
  await until(() => store.failedCount() === 1);
  assert.equal(calls, 3);
  assert.equal(queue.snapshot().retry_exhaustions, 1);
  const restored = new JobStore(path);
  const restarted = new JobQueue(config, restored, async () => { calls += 1; return false; });
  t.after(() => restarted.stop());
  restarted.start();
  assert.equal(restored.pending().length, 0);
  assert.equal(calls, 3);
  assert.equal(restarted.enqueue(job()), true);
  assert.equal(calls, 3);
});

test("restart preserves retry timing, intent and same-conversation order", async (t) => {
  const path = temporary(t);
  const store = new JobStore(path);
  store.add(job({ attempt: 2, nextAttemptAt: Date.now() + 40, phase: "handoff_pending", decisionAction: "handoff" }));
  store.add(job({ messageId: "43" }));
  const calls = [];
  const queue = new JobQueue(config, new JobStore(path), async (_config, current) => {
    calls.push(current.messageId);
    if (current.messageId === "42") assert.equal(current.phase, "handoff_pending");
    return true;
  });
  t.after(() => queue.stop());
  queue.start();
  assert.deepEqual(calls, []);
  await until(() => calls.length === 2 && queue.snapshot().active === 0);
  assert.deepEqual(calls, ["42", "43"]);
});

test("durability failure stops queue and invokes fatal handler without logging raw errors", async (t) => {
  const store = new JobStore(temporary(t));
  let fatal = 0;
  const queue = new JobQueue(config, store, async () => true, () => { fatal += 1; });
  t.after(() => queue.stop());
  store.remove = () => { throw new Error("synthetic-private-value"); };
  queue.enqueue(job());
  await until(() => fatal === 1);
  assert.equal(queue.snapshot().accepting, false);
  assert.equal(store.pending().length, 1);
});

test("permanent vendor failures become terminal without retrying", async (t) => {
  const store = new JobStore(temporary(t));
  let calls = 0;
  const queue = new JobQueue(config, store, async (_config, current) => {
    calls += 1;
    current.retryable = false;
    current.failureCode = "chatwoot_http_401";
    return false;
  });
  t.after(() => queue.stop());
  queue.enqueue(job());
  await until(() => store.failedCount() === 1);
  assert.equal(calls, 1);
  assert.equal(queue.snapshot().retry_exhaustions, 0);
});
