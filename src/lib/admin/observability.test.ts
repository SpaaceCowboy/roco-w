import assert from "node:assert/strict";
import test from "node:test";

process.env.ADMIN_ALERT_FAILURE_THRESHOLD = "2";

type Captured = { errors: string[]; info: string[] };

async function withCapturedConsole(run: () => void): Promise<Captured> {
  const captured: Captured = { errors: [], info: [] };
  const originalError = console.error;
  const originalInfo = console.info;
  console.error = (line?: unknown) => captured.errors.push(String(line));
  console.info = (line?: unknown) => captured.info.push(String(line));
  try {
    run();
  } finally {
    console.error = originalError;
    console.info = originalInfo;
  }
  return captured;
}

test("consecutive failures emit exactly one alert at the threshold and then reset", async () => {
  const { adminEvents, reportAdminFailure, resetAdminFailureStreaks } = await import("./observability");
  resetAdminFailureStreaks();
  const captured = await withCapturedConsole(() => {
    reportAdminFailure(adminEvents.api, { name: "Error" });
    reportAdminFailure(adminEvents.api, { name: "Error" });
    reportAdminFailure(adminEvents.api, { name: "Error" });
  });
  const records = captured.errors.map((line) => JSON.parse(line) as Record<string, unknown>);
  const alerts = records.filter((record) => record.event === adminEvents.alert);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.trigger, adminEvents.api);
  assert.equal(alerts[0]?.consecutiveFailures, 2);
});

test("a success clears the failure streak so the next failure does not alert", async () => {
  const { adminEvents, reportAdminFailure, reportAdminSuccess, resetAdminFailureStreaks } = await import("./observability");
  resetAdminFailureStreaks();
  const captured = await withCapturedConsole(() => {
    reportAdminFailure(adminEvents.mediaUpload, {});
    reportAdminSuccess(adminEvents.mediaUpload, {});
    reportAdminFailure(adminEvents.mediaUpload, {});
  });
  const alerts = captured.errors.filter((line) => JSON.parse(line).outcome === "alert");
  assert.equal(alerts.length, 0);
});

test("log records are structured single-line JSON with no stray fields", async () => {
  const { adminEvents, reportAdminFailure, resetAdminFailureStreaks } = await import("./observability");
  resetAdminFailureStreaks();
  const captured = await withCapturedConsole(() => reportAdminFailure(adminEvents.auth, { reason: "not_allowlisted" }));
  const record = JSON.parse(captured.errors[0]!) as Record<string, unknown>;
  assert.equal(record.event, adminEvents.auth);
  assert.equal(record.outcome, "failure");
  assert.equal(record.reason, "not_allowlisted");
  assert.equal(record.consecutiveFailures, 1);
  assert.equal(typeof record.ts, "string");
});
