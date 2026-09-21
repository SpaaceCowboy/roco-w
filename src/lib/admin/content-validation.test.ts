import assert from "node:assert/strict";
import test from "node:test";
import { deleteContentSchema, normalizeSlug, saveDraftSchema } from "./content-validation";

test("normalizes Latin and Persian slugs without dropping script characters", () => {
  assert.equal(normalizeSlug("  Hello_World  "), "hello-world");
  assert.equal(normalizeSlug("راهنمای حساب"), "راهنمای-حساب");
});

test("rejects malformed slugs", () => {
  const result = saveDraftSchema.safeParse({
    version: 1,
    title: "Title",
    slug: "bad/slug",
    excerpt: "",
    authorName: "Editor",
    document: { type: "doc", content: [{ type: "paragraph" }] },
    seo: {
      title: null, description: null, canonicalOverride: null, noIndex: false, noFollow: false,
      socialTitle: null, socialDescription: null, featuredMediaId: null, featuredImageAlt: "", socialMediaId: null,
    },
  });
  assert.equal(result.success, false);
});

test("accepts a localization or whole-post deletion with a positive version", () => {
  assert.equal(deleteContentSchema.safeParse({ scope: "localization", expectedVersion: 3 }).success, true);
  assert.equal(deleteContentSchema.safeParse({ scope: "post", expectedVersion: 1 }).success, true);
});

test("rejects an unknown scope or a missing/non-positive version", () => {
  assert.equal(deleteContentSchema.safeParse({ scope: "everything", expectedVersion: 1 }).success, false);
  assert.equal(deleteContentSchema.safeParse({ scope: "post" }).success, false);
  assert.equal(deleteContentSchema.safeParse({ scope: "post", expectedVersion: 0 }).success, false);
  assert.equal(deleteContentSchema.safeParse({ scope: "post", expectedVersion: -1 }).success, false);
});
