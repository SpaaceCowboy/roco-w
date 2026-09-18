import assert from "node:assert/strict";
import test from "node:test";
import { AdminApiError } from "./errors";
import { assertSameOrigin, isSameOrigin, type OriginRequest } from "./origin";

function request(url: string, headers: Record<string, string> = {}): OriginRequest {
  const lower = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    url,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
  };
}

test("same-origin mutations pass", () => {
  const req = request("https://admin.rocobroker.com/api/admin/posts", {
    origin: "https://admin.rocobroker.com",
    host: "admin.rocobroker.com",
  });
  assert.equal(isSameOrigin(req), true);
  assert.doesNotThrow(() => assertSameOrigin(req));
});

test("a missing Origin header is rejected, not trusted", () => {
  const req = request("https://admin.rocobroker.com/api/admin/posts", { host: "admin.rocobroker.com" });
  assert.equal(isSameOrigin(req), false);
  assert.throws(() => assertSameOrigin(req), AdminApiError);
});

test("a cross-origin mutation is rejected", () => {
  const forged = request("https://admin.rocobroker.com/api/admin/posts", {
    origin: "https://evil.example.com",
    host: "admin.rocobroker.com",
  });
  assert.equal(isSameOrigin(forged), false);
  assert.throws(() => assertSameOrigin(forged), (error: unknown) => error instanceof AdminApiError && error.status === 403);
});

test("a scheme or port difference is not treated as same-origin", () => {
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", {
    origin: "http://admin.rocobroker.com",
    host: "admin.rocobroker.com",
  })), false);
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", {
    origin: "https://admin.rocobroker.com:8443",
    host: "admin.rocobroker.com",
  })), false);
});

test("a TLS-terminating proxy (x-forwarded-proto) is treated as same-origin", () => {
  const proxied = request("http://rocobroker.com/api/admin/posts", {
    origin: "https://rocobroker.com",
    host: "rocobroker.com",
    "x-forwarded-proto": "https",
  });
  assert.equal(isSameOrigin(proxied), true);
  assert.doesNotThrow(() => assertSameOrigin(proxied));
});

test("an https Origin is rejected when the proxy scheme header is missing", () => {
  const noProto = request("http://rocobroker.com/api/admin/posts", {
    origin: "https://rocobroker.com",
    host: "rocobroker.com",
  });
  assert.equal(isSameOrigin(noProto), false);
});

test("a malformed Origin is rejected without throwing a parser error", () => {
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", {
    origin: "not a url",
    host: "admin.rocobroker.com",
  })), false);
  assert.equal(isSameOrigin(request("https://admin.rocobroker.com/api/admin/posts", {
    origin: "null",
    host: "admin.rocobroker.com",
  })), false);
});
