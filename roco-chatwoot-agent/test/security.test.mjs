import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { redactForModel, verifyChatwootSignature } from "../dist/security.js";

test("accepts a current valid Chatwoot signature", () => {
  const rawBody = '{"event":"message_created","content":"hello"}';
  const timestamp = "1800000000";
  const secret = "test-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
  assert.equal(
    verifyChatwootSignature({
      rawBody,
      timestamp,
      signature,
      secret,
      maxAgeSeconds: 300,
      nowSeconds: 1800000010,
    }),
    true,
  );
});

test("rejects a stale or modified webhook", () => {
  const rawBody = '{"event":"message_created"}';
  const timestamp = "1800000000";
  const secret = "test-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
  assert.equal(verifyChatwootSignature({ rawBody: `${rawBody} `, timestamp, signature, secret, maxAgeSeconds: 300, nowSeconds: 1800000010 }), false);
  assert.equal(verifyChatwootSignature({ rawBody, timestamp, signature, secret, maxAgeSeconds: 300, nowSeconds: 1800001000 }), false);
});

test("redacts common personal identifiers", () => {
  const value = redactForModel("Email me at client@example.com or +44 7401 123456, wallet 0x1234567890abcdef1234567890abcdef.");
  assert.doesNotMatch(value, /client@example\.com/);
  assert.doesNotMatch(value, /7401 123456/);
  assert.doesNotMatch(value, /1234567890abcdef1234567890abcdef/);
});

test("redacts credential-like historical content", () => {
  const value = redactForModel("password=hunter2 otp: 123456 card 4111 1111 1111 1111");
  assert.equal(value.includes("hunter2"), false);
  assert.equal(value.includes("123456"), false);
  assert.equal(value.includes("4111"), false);
});
