import assert from "node:assert/strict";
import test from "node:test";
import { readAdminAuthConfig } from "./auth-config";

const complete = {
  ADMIN_AUTH_BASE_URL: "https://rocobroker.com",
  ADMIN_AUTH_SECRET: "a".repeat(32),
  ADMIN_GOOGLE_CLIENT_ID: "client-id",
  ADMIN_GOOGLE_CLIENT_SECRET: "client-secret",
};

test("returns null when admin authentication is entirely unconfigured", () => {
  assert.equal(readAdminAuthConfig({}), null);
});

test("rejects a partial authentication configuration", () => {
  assert.throws(() => readAdminAuthConfig({ ADMIN_AUTH_BASE_URL: complete.ADMIN_AUTH_BASE_URL }), /Incomplete/);
});

test("rejects non-HTTPS remote origins", () => {
  assert.throws(() => readAdminAuthConfig({ ...complete, ADMIN_AUTH_BASE_URL: "http://example.com" }), /HTTPS/);
});

test("accepts complete Google OIDC configuration", () => {
  assert.deepEqual(readAdminAuthConfig(complete), {
    baseUrl: "https://rocobroker.com",
    secret: complete.ADMIN_AUTH_SECRET,
    googleClientId: "client-id",
    googleClientSecret: "client-secret",
    googleHostedDomain: undefined,
  });
});
