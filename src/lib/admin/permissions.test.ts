import assert from "node:assert/strict";
import test from "node:test";
import { AdminAuthorizationError, hasAdminPermission, requireAdminPermission } from "./permissions";

test("editors cannot publish or manage users", () => {
  assert.equal(hasAdminPermission("editor", "content:write"), true);
  assert.equal(hasAdminPermission("editor", "content:publish"), false);
  assert.equal(hasAdminPermission("editor", "users:manage"), false);
});

test("reviewers can publish but cannot manage users", () => {
  assert.equal(hasAdminPermission("reviewer", "content:publish"), true);
  assert.equal(hasAdminPermission("reviewer", "users:manage"), false);
});

test("admins have every permission", () => {
  assert.equal(hasAdminPermission("admin", "users:manage"), true);
  assert.equal(hasAdminPermission("admin", "audit:read"), true);
});

test("denied permissions throw a typed error", () => {
  assert.throws(() => requireAdminPermission("editor", "content:publish"), AdminAuthorizationError);
});
