import assert from "node:assert/strict";
import test from "node:test";
import {
  staffAuthRouteAllowed,
  staffReturnPath,
  hasVerifiedMfa,
  serviceAuthorized,
} from "./staff-policy";

test("staff authentication cannot expose signup, social login, password recovery or disable-MFA APIs", () => {
  for (const route of [
    "/sign-up/email",
    "/sign-in/social",
    "/two-factor/disable",
    "/request-password-reset",
    "/change-email",
    "/change-password",
    "/admin/create-user",
  ])
    assert.equal(staffAuthRouteAllowed(route), false);
  assert.equal(staffAuthRouteAllowed("/two-factor/verify-totp"), true);
});
test("MFA enforcement is per session, rejects enrollment sessions and expired sessions", () => {
  const now = Date.now(),
    expiresAt = new Date(now + 1000);
  assert.equal(hasVerifiedMfa({ expiresAt }, true, now), false);
  assert.equal(
    hasVerifiedMfa({ expiresAt, mfaVerifiedAt: new Date(now) }, false, now),
    false,
  );
  assert.equal(
    hasVerifiedMfa({ expiresAt, mfaVerifiedAt: new Date(now + 1) }, true, now),
    false,
  );
  assert.equal(
    hasVerifiedMfa(
      { expiresAt: new Date(now), mfaVerifiedAt: new Date(now - 1) },
      true,
      now,
    ),
    false,
  );
  assert.equal(
    hasVerifiedMfa({ expiresAt, mfaVerifiedAt: new Date(now) }, true, now),
    true,
  );
});
test("dashboard return paths cannot become open redirects", () => {
  for (const value of [
    "//evil.test",
    "https://evil.test",
    "/\\evil.test",
    "/admin/sign-in",
    "/administer",
  ])
    assert.equal(staffReturnPath(value), "/admin");
  assert.equal(staffReturnPath("/"), "/");
  assert.equal(staffReturnPath("/admin/posts/123"), "/admin/posts/123");
});
test("session service rejects missing, wrong and unconfigured credentials", () => {
  const key = "test-service-key-".repeat(3);
  assert.equal(serviceAuthorized(new Headers(), key), false);
  assert.equal(
    serviceAuthorized(new Headers({ authorization: "Bearer wrong" }), key),
    false,
  );
  assert.equal(
    serviceAuthorized(
      new Headers({ authorization: `Bearer ${key}` }),
      undefined,
    ),
    false,
  );
  assert.equal(
    serviceAuthorized(new Headers({ authorization: `Bearer ${key}` }), key),
    true,
  );
});

 test("authenticated SCC headers remain valid through Apache's appended proxy host", async () => {
  const { trustedStaffProxy } = await import("./staff-policy");
  const { isSameOrigin } = await import("./origin");
  const names = ["ADMIN_AUTH_MODE", "ADMIN_AUTH_BASE_URL", "ADMIN_STAFF_SERVICE_SECRET", "ADMIN_STAFF_SERVICE_SECRET_FILE"];
  const before = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.ADMIN_AUTH_MODE = "staff";
    process.env.ADMIN_AUTH_BASE_URL = "https://scc.rocobroker.com";
    process.env.ADMIN_STAFF_SERVICE_SECRET = "test-service-key-".repeat(3);
    delete process.env.ADMIN_STAFF_SERVICE_SECRET_FILE;
    const headers = new Headers({ origin: "https://scc.rocobroker.com", host: "rocobroker.com", "x-forwarded-host": "scc.rocobroker.com, rocobroker.com", "x-forwarded-proto": "https", "x-roco-proxy-key": process.env.ADMIN_STAFF_SERVICE_SECRET });
    assert.equal(trustedStaffProxy(headers), true);
    assert.equal(isSameOrigin({ url: "http://127.0.0.1:3100/api/admin/posts", headers }), true);
    headers.set("x-roco-proxy-key", "wrong");
    assert.equal(trustedStaffProxy(headers), false);
    headers.set("x-roco-proxy-key", process.env.ADMIN_STAFF_SERVICE_SECRET);
    headers.set("x-forwarded-host", "evil.example, scc.rocobroker.com");
    assert.equal(trustedStaffProxy(headers), false);
    headers.set("x-forwarded-host", "scc.rocobroker.com, rocobroker.com");
    headers.set("origin", "https://evil.example");
    assert.equal(isSameOrigin({ url: "http://127.0.0.1:3100/api/admin/posts", headers }), false);
  } finally {
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name]; else process.env[name] = before[name];
    }
  }
});
