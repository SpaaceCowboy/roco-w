import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAdminEmail } from "./identity";

test("normalizes allowlist email consistently", () => {
  assert.equal(normalizeAdminEmail(" Editor@Example.COM "), "editor@example.com");
});
