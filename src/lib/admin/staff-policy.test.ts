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
