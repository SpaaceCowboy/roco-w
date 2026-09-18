import assert from "node:assert/strict";
import test from "node:test";
import { analyzeArticleSeo, buildArticleSeo, normalizeCanonicalOverride, serializeJsonLd } from "./article-seo";

test("custom canonicals require approved HTTPS hosts", () => {
  const hosts = new Set(["rocobroker.com"]);
  assert.equal(normalizeCanonicalOverride("https://rocobroker.com/en/blog/test", hosts), "https://rocobroker.com/en/blog/test");
  assert.throws(() => normalizeCanonicalOverride("https://example.com/test", hosts), /not approved/);
  assert.throws(() => normalizeCanonicalOverride("http://rocobroker.com/test", hosts), /HTTPS/);
});

test("hreflang only includes real translations", () => {
  const result = buildArticleSeo({
    siteUrl: "https://rocobroker.com", locale: "fa", slug: "آزمون", title: "آزمون", excerpt: "توضیح",
    seoTitle: null, seoDescription: null, canonicalOverride: null, noIndex: false, noFollow: false,
    socialTitle: null, socialDescription: null, socialImageUrl: null, featuredImageUrl: null,
    authorName: "Editorial", publishedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    translations: [{ locale: "en", slug: "test" }, { locale: "fa", slug: "آزمون" }],
  });
  assert.deepEqual(Object.keys(result.languages).sort(), ["en", "fa", "x-default"]);
  assert.equal(result.canonical, "https://rocobroker.com/fa/%D8%A2%D8%B2%D9%85%D9%88%D9%86");
  assert.equal(result.robots.index, true);
});

test("editorial checks flag heading jumps and broken internal links", () => {
  const checks = analyzeArticleSeo({
    title: "Title", excerpt: "Description", seoTitle: null, seoDescription: null,
    featuredMediaId: null, featuredImageAlt: "", socialMedia: null,
    knownInternalPaths: new Set(["/en/blog"]),
    document: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Jump" }] }, { type: "paragraph", content: [{ type: "text", text: "Link", marks: [{ type: "link", attrs: { href: "/de/blog/missing" } }] }] }] },
  });
  assert.ok(checks.some((check) => check.code === "heading-order"));
  assert.ok(checks.some((check) => check.code === "internal-link-broken"));
});

test("JSON-LD serialization cannot close its script element", () => {
  assert.equal(serializeJsonLd({ title: "</script><script>alert(1)</script>" }).includes("</script>"), false);
});
