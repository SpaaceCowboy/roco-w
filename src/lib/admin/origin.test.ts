import assert from "node:assert/strict";
import test from "node:test";
import { AdminApiError } from "./errors";
import { assertSameOrigin, isSameOrigin } from "./origin";

function request(url: string, origin?: string): Request {
  return new Request(url, { method: "POST", headers: origin === undefined ? {} : { origin } });
}

test("same-origin mutations pass", () => {
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", "https://admin.rocobroker.com")), true);
  assert.doesNotThrow(() => assertSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", "https://admin.rocobroker.com")));
});

test("a missing Origin header is rejected, not trusted", () => {
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts")), false);
  assert.throws(() => assertSameOrigin(request("https://admin.rocobroker.com/api/admin/posts")), AdminApiError);
});

test("a cross-origin mutation is rejected", () => {
  const forged = request("https://admin.rocobroker.com/api/admin/posts", "https://evil.example.com");
  assert.equal(isSameOrigin(forged), false);
  assert.throws(() => assertSameOrigin(forged), (error: unknown) => error instanceof AdminApiError && error.status === 403);
});

test("a scheme or port difference is not treated as same-origin", () => {
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", "http://admin.rocobroker.com")), false);
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", "https://admin.rocobroker.com:8443")), false);
});

test("a malformed Origin is rejected without throwing a parser error", () => {
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", "not a url")), false);
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", "null")), false);
});
