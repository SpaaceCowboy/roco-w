import assert from "node:assert/strict";
import test from "node:test";
import { isSessionActive } from "./session-policy";

const now = new Date("2026-09-18T12:00:00.000Z");

test("a missing session is inactive", () => {
  assert.equal(isSessionActive(null, now), false);
  assert.equal(isSessionActive(undefined, now), false);
});

test("an expired session is inactive and a live one is active", () => {
  assert.equal(isSessionActive({ expiresAt: new Date("2026-09-18T11:59:59.000Z") }, now), false);
  assert.equal(isSessionActive({ expiresAt: new Date("2026-09-18T12:00:01.000Z") }, now), true);
});

test("an expiry exactly at the check instant is inactive", () => {
  assert.equal(isSessionActive({ expiresAt: new Date(now.getTime()) }, now), false);
});

test("narrowing keeps the session usable after the guard", () => {
  const session: { expiresAt: Date; role: string } | null = { expiresAt: new Date("2026-09-18T13:00:00.000Z"), role: "admin" };
  if (!isSessionActive(session, now)) throw new Error("expected active session");
  assert.equal(session.role, "admin");
});
