import assert from "node:assert/strict";
import test from "node:test";
import { isBotAvailable, validateAvailability } from "../dist/availability.js";

const overnight = { timezone: "Asia/Tehran", start: "23:00", end: "08:00", outsideHours: "silent_handoff" };

test("daily Tehran overnight schedule includes 23:00 and excludes 08:00", () => {
  const cases = [
    ["2026-10-05T22:59:59+03:30", false], ["2026-10-05T23:00:00+03:30", true],
    ["2026-10-06T00:00:00+03:30", true], ["2026-10-06T07:59:59+03:30", true],
    ["2026-10-06T08:00:00+03:30", false], ["2026-10-06T12:00:00+03:30", false],
    ["2026-10-09T23:00:00+03:30", true], ["2026-10-10T07:59:59+03:30", true],
  ];
  for (const [instant, expected] of cases) assert.equal(isBotAvailable(overnight, new Date(instant)), expected, instant);
});

test("uses the configured timezone independently of the server zone", () => {
  assert.equal(isBotAvailable(overnight, new Date("2026-10-05T19:30:00Z")), true);
  assert.equal(isBotAvailable(overnight, new Date("2026-10-06T04:30:00Z")), false);
  assert.equal(isBotAvailable({ ...overnight, timezone: "UTC" }, new Date("2026-10-05T19:30:00Z")), false);
});

test("same-day intervals and timezone DST transitions use local civil time", () => {
  const daytime = { ...overnight, start: "09:00", end: "17:00" };
  assert.equal(isBotAvailable(daytime, new Date("2026-10-05T09:00:00+03:30")), true);
  assert.equal(isBotAvailable(daytime, new Date("2026-10-05T17:00:00+03:30")), false);
  const dst = { ...overnight, timezone: "America/New_York" };
  assert.equal(isBotAvailable(dst, new Date("2026-03-08T07:59:59-04:00")), true);
  assert.equal(isBotAvailable(dst, new Date("2026-03-08T08:00:00-04:00")), false);
  assert.equal(isBotAvailable(dst, new Date("2026-11-01T01:30:00-04:00")), true);
  assert.equal(isBotAvailable(dst, new Date("2026-11-01T01:30:00-05:00")), true);
});

test("bad schedules fail validation rather than silently becoming all-day availability", () => {
  for (const value of [null, [], {}, { ...overnight, timezone: "Invalid/Timezone" }, { ...overnight, start: "11pm" },
    { ...overnight, end: "24:00" }, { ...overnight, end: "23:00" }, { ...overnight, outsideHours: "ignore" },
    { ...overnight, days: [] }]) {
    assert.throws(() => validateAvailability(value));
  }
  assert.deepEqual(validateAvailability(overnight), overnight);
});

// Schedule integration uses a controllable clock and synthetic vendors only.
import { processMessage } from "../dist/bot.js";
import { JobStore } from "../dist/store.js";
import { config, job, vendorMock, withFetch } from "./support.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const day = () => new Date("2026-10-06T08:00:00+03:30");
const night = () => new Date("2026-10-06T23:00:00+03:30");

test("outside hours bypasses the model, confirms transfer, then posts a Persian offline notice", async () => {
  const { state, fetch } = vendorMock();
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job(), undefined, day), true));
  assert.equal(state.modelCalls.length, 0);
  assert.equal(state.status, "open");
  assert.equal(state.toggles, 1);
  assert.equal(state.posts.length, 1);
  assert.match(state.posts[0].content, /در حال حاضر فعال نیست/);
  assert.equal(state.posts[0].content_attributes.decision_reason, "outside_bot_hours");
  assert.ok(state.calls.findIndex(c => c.path.endsWith("/toggle_status")) <
    state.calls.findIndex(c => c.method === "POST" && c.path.endsWith("/messages")));
});

test("failed daytime transfer survives restart and finishes after 23:00 without a model call", async t => {
  const dir = mkdtempSync(join(tmpdir(), "roco-availability-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "jobs.json");
  const store = new JobStore(path);
  const current = job();
  store.add(current);
  const { state, fetch } = vendorMock({ toggleFailures: 1 });
  await withFetch(fetch, async () => {
    assert.equal(await processMessage(config, current, j => store.update(j), day), false);
    assert.equal(state.posts.length, 0);
    const restoredStore = new JobStore(path);
    const restored = { ...restoredStore.pending()[0], content: "" };
    assert.equal(restored.outsideHours, true);
    assert.equal(restored.reason, "outside_bot_hours");
    assert.equal(await processMessage(config, restored, j => restoredStore.update(j), night), true);
  });
  assert.equal(state.modelCalls.length, 0);
  assert.equal(state.posts.length, 1);
  assert.doesNotMatch(state.posts[0].content, /در حال حاضر فعال نیست/);
  assert.match(state.posts[0].content, /منتقل شد/);
});

test("a model request crossing the 08:00 cutoff is replaced with an offline transfer", async () => {
  let instant = new Date("2026-10-06T07:59:59+03:30");
  const { state, fetch } = vendorMock({ onModel: () => { instant = day(); } });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job(), undefined, () => instant), true));
  assert.equal(state.modelCalls.length, 1);
  assert.equal(state.toggles, 1);
  assert.match(state.posts[0].content, /در حال حاضر فعال نیست/);
  assert.doesNotMatch(state.posts[0].content, /MetaTrader/);
});

test("a daytime-received queued message remains destined for support when processed at night", async () => {
  const { state, fetch } = vendorMock();
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job({ outsideHours: true }), undefined, night), true));
  assert.equal(state.modelCalls.length, 0);
  assert.equal(state.status, "open");
});

test("during active hours general questions get answers without handoff", async () => {
  const { state, fetch } = vendorMock();
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job(), undefined, night), true));
  assert.equal(state.modelCalls.length, 1);
  assert.equal(state.toggles, 0);
  assert.doesNotMatch(state.posts[0].content, /در حال حاضر فعال نیست/);
});

test("uncertain offline-message POST reconciles its marker without duplicate transfer or notice", async () => {
  const { state, fetch } = vendorMock({ losePostAcknowledgement: true });
  const current = job();
  await withFetch(fetch, async () => {
    assert.equal(await processMessage(config, current, undefined, day), false);
    assert.equal(await processMessage(config, current, undefined, night), true);
  });
  assert.equal(state.toggles, 1);
  assert.equal(state.posts.length, 1);
  assert.equal(state.modelCalls.length, 0);
});

test("daytime processing respects existing human ownership", async () => {
  const { state, fetch } = vendorMock({ status: "open" });
  await withFetch(fetch, async () => assert.equal(await processMessage(config, job(), undefined, day), true));
  assert.equal(state.toggles, 0);
  assert.equal(state.posts.length, 0);
  assert.equal(state.modelCalls.length, 0);
});
