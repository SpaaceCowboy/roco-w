import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalDevDatabase, isLocalDevAdminRequest } from "./local-dev-policy";

const enabled = { NODE_ENV: "development", ADMIN_LOCAL_DEV_BYPASS: "1", npm_lifecycle_event: "dev:local" };

test("local admin bypass requires an explicit flag and development mode", () => {
  const headers = new Headers({ host: "localhost:3000" });
  assert.equal(isLocalDevAdminRequest(headers, enabled), true);
  for (const mode of ["production", "test", undefined]) {
    assert.equal(isLocalDevAdminRequest(headers, { ...enabled, NODE_ENV: mode }), false);
  }
  assert.equal(isLocalDevAdminRequest(headers, { NODE_ENV: "development" }), false);
});

test("local admin bypass requires the loopback-bound dev:local script, not just the flag", () => {
  const headers = new Headers({ host: "localhost:3000" });
  assert.equal(isLocalDevAdminRequest(headers, { ...enabled, npm_lifecycle_event: "dev" }), false);
  assert.equal(isLocalDevAdminRequest(headers, { ...enabled, npm_lifecycle_event: undefined }), false);
});

test("local admin bypass accepts loopback requests but rejects public and malformed hosts", () => {
  for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
    assert.equal(isLocalDevAdminRequest(new Headers({ host }), enabled), true);
  }
  for (const host of ["rocobroker.com", "localhost.example.com", "192.168.1.2:3000", "evil@localhost:3000", "localhost:3000/path", "localhost:3000,evil.example"]) {
    assert.equal(isLocalDevAdminRequest(new Headers({ host }), enabled), false);
  }
  assert.equal(isLocalDevAdminRequest(new Headers(), enabled), false);
});

test("local admin bypass rejects forwarded public hosts and foreign origins", () => {
  assert.equal(isLocalDevAdminRequest(new Headers({ host: "localhost:3000", origin: "http://localhost:3000" }), enabled), true);
  const rejectedHeaders: Record<string, string>[] = [
    { "x-forwarded-host": "rocobroker.com" },
    { origin: "https://evil.example" },
    { origin: "http://localhost:4000" },
    { origin: "http://localhost:3000/path" },
    { origin: "null" },
  ];
  for (const extra of rejectedHeaders) {
    assert.equal(isLocalDevAdminRequest(new Headers({ host: "localhost:3000", ...extra }), enabled), false);
  }
});

test("local admin bypass cannot use a remote database or connection host overrides", () => {
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.doesNotThrow(() => assertLocalDevDatabase({ DATABASE_URL: `postgresql://${hostname}:5432/local_test` }));
  }
  for (const connection of [undefined, "invalid", "postgresql://db.example.com/test", "https://localhost/test", "postgresql://localhost/test?host=db.example.com", "postgresql://localhost/test?hostaddr=203.0.113.1", "postgresql://localhost/test?service=production"]) {
    assert.throws(() => assertLocalDevDatabase({ DATABASE_URL: connection }), /Local admin bypass requires/);
  }
});
