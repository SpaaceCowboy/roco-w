import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { randomUUID } from "node:crypto";
import { RateLimitExceededError } from "./errors";
import { adminRateLimitPolicies, enforceAdminRateLimit } from "./rate-limit";

const originalError = console.error;
const originalInfo = console.info;
beforeEach(() => {
  console.error = () => {};
  console.info = () => {};
});
afterEach(() => {
  console.error = originalError;
  console.info = originalInfo;
});

test("per-identity buckets are isolated and overflow throws", () => {
  const identity = randomUUID();
  const { limit } = adminRateLimitPolicies.upload;
  for (let i = 0; i < limit; i += 1) assert.doesNotThrow(() => enforceAdminRateLimit("upload", identity));
  assert.throws(() => enforceAdminRateLimit("upload", identity), RateLimitExceededError);
  assert.doesNotThrow(() => enforceAdminRateLimit("upload", randomUUID()));
});

test("buckets are isolated from each other for the same identity", () => {
  const identity = randomUUID();
  const { limit } = adminRateLimitPolicies.preview;
  for (let i = 0; i < limit; i += 1) enforceAdminRateLimit("preview", identity);
  assert.throws(() => enforceAdminRateLimit("preview", identity), RateLimitExceededError);
  assert.doesNotThrow(() => enforceAdminRateLimit("mutation", identity));
});

test("rate limit errors carry a positive Retry-After", () => {
  const identity = randomUUID();
  const { limit } = adminRateLimitPolicies.mutation;
  for (let i = 0; i < limit; i += 1) enforceAdminRateLimit("mutation", identity);
  try {
    enforceAdminRateLimit("mutation", identity);
    assert.fail("expected a rate limit error");
  } catch (error) {
    assert.ok(error instanceof RateLimitExceededError);
    assert.ok(error.retryAfterSeconds >= 1);
    assert.equal(error.status, 429);
  }
});
