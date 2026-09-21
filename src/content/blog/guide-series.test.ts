import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { guideSeries } from "./guide-series";
import { guideArticles } from "./guides";
import type { GuideScreenshot } from "./guide-types";

const EXPECTED_SLUGS = [
  "registration",
  "identity-verification",
  "ib-request",
  "trading-account",
  "cent-account",
  "rial-deposit",
  "rial-withdrawal",
  "crypto-deposit",
  "crypto-withdrawal",
  "internal-transfer",
  "bonus",
  "social-trading",
];

function screenshots(slug: string): GuideScreenshot[] {
  const article = guideArticles.find((item) => item.slug === slug);
  assert.ok(article, `missing guide article: ${slug}`);
  return article.sections.flatMap((section) => [
    ...(section.image ? [section.image] : []),
    ...(section.steps ?? []).flatMap((step) => (step.image ? [step.image] : [])),
  ]);
}

test("guide series exposes the twelve guides in scope order", () => {
  assert.equal(guideSeries.length, 1);
  const series = guideSeries[0];
  assert.equal(series.locale, "fa");
  assert.deepEqual(series.articles.map((article) => article.slug), EXPECTED_SLUGS);
  assert.equal(new Set(EXPECTED_SLUGS).size, EXPECTED_SLUGS.length);
});

test("every guide article has unique section anchors and real reading time", () => {
  for (const article of guideArticles) {
    assert.ok(article.sections.length > 0, `${article.slug} has no sections`);
    const ids = article.sections.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length, `${article.slug} has duplicate section ids`);
    assert.ok(article.readingMinutes > 0, `${article.slug} has no reading time`);
    assert.match(article.updatedAt, /^\d{4}-\d{2}-\d{2}$/, `${article.slug} updatedAt is not ISO`);
  }
});

test("no guide article depends on a PDF, Canva embed, or iframe", () => {
  const blob = JSON.stringify(guideArticles);
  assert.doesNotMatch(blob, /\.pdf/i);
  assert.doesNotMatch(blob, /canva/i);
  assert.doesNotMatch(blob, /<iframe/i);
  assert.doesNotMatch(blob, /embedUrl|downloadUrl|downloadLabel/i);
});

test("every guide screenshot points at a committed web asset", () => {
  const root = path.resolve(process.cwd(), "public");
  for (const article of guideArticles) {
    const images = article.sections.flatMap((section) => [
      ...(section.image ? [section.image] : []),
      ...(section.steps ?? []).flatMap((step) => (step.image ? [step.image] : [])),
    ]);
    for (const image of images) {
      assert.doesNotMatch(image.src, /\.pdf$/i, `${article.slug} references a PDF image`);
      assert.ok(image.alt.trim().length > 0, `${article.slug} has an image without alt text`);
      assert.ok(existsSync(path.join(root, image.src)), `${article.slug} is missing ${image.src}`);
    }
  }
  assert.ok(screenshots("registration").length > 0);
});
