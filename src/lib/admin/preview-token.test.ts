import assert from "node:assert/strict";
import test from "node:test";

process.env.ADMIN_PREVIEW_SECRET = "preview-test-secret-with-more-than-32-characters";

test("preview tokens expire and reject tampering", async () => {
  const { createPreviewToken, verifyPreviewToken } = await import("./preview-token");
  const now = Date.now();
  const token = createPreviewToken("00000000-0000-4000-8000-000000000001", "fa", now);
  assert.equal(verifyPreviewToken(token, now)?.locale, "fa");
  assert.equal(verifyPreviewToken(`${token}x`, now), null);
  assert.equal(verifyPreviewToken(token, now + 16 * 60_000), null);
});
