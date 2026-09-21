import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { guideSeries } from "./guide-series";
import { enGuideArticles, faGuideArticles } from "./guides";
import type { GuideArticleContent, GuideScreenshot } from "./guide-types";

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

const ARTICLES_BY_LOCALE = { fa: faGuideArticles, en: enGuideArticles } as const;

function images(article: GuideArticleContent): GuideScreenshot[] {
  return article.sections.flatMap((section) => [
    ...(section.image ? [section.image] : []),
    ...(section.steps ?? []).flatMap((step) => (step.image ? [step.image] : [])),
  ]);
}

test("the guide series ships in Persian and English with the same ordered slugs", () => {
  assert.equal(guideSeries.length, 2);
  assert.deepEqual(guideSeries.map((series) => series.locale).sort(), ["en", "fa"]);
  assert.deepEqual(guideSeries.map((series) => series.slug), ["راهنمای-گام-به-گام", "step-by-step-guide"]);

  for (const series of guideSeries) {
    assert.deepEqual(series.articles.map((article) => article.slug), EXPECTED_SLUGS, `${series.locale} order changed`);
  }
  assert.equal(new Set(EXPECTED_SLUGS).size, EXPECTED_SLUGS.length);
});

test("every guide article has unique section anchors and real reading time", () => {
  for (const [locale, articles] of Object.entries(ARTICLES_BY_LOCALE)) {
    assert.equal(articles.length, EXPECTED_SLUGS.length, `${locale} article count`);
    for (const article of articles) {
      assert.ok(article.sections.length > 0, `${locale}/${article.slug} has no sections`);
      const ids = article.sections.map((section) => section.id);
      assert.equal(new Set(ids).size, ids.length, `${locale}/${article.slug} has duplicate section ids`);
      assert.ok(article.readingMinutes > 0, `${locale}/${article.slug} has no reading time`);
      assert.match(article.updatedAt, /^\d{4}-\d{2}-\d{2}$/, `${locale}/${article.slug} updatedAt is not ISO`);
    }
  }
});

test("the English series mirrors the Persian section anchors exactly", () => {
  for (const slug of EXPECTED_SLUGS) {
    const fa = faGuideArticles.find((article) => article.slug === slug);
    const en = enGuideArticles.find((article) => article.slug === slug);
    assert.ok(fa && en, `missing article for ${slug}`);
    assert.deepEqual(
      en.sections.map((section) => section.id),
      fa.sections.map((section) => section.id),
      `${slug} section anchors diverge`,
    );
    assert.equal(en.readingMinutes, fa.readingMinutes, `${slug} reading time diverges`);
  }
});

test("no guide article depends on a PDF, Canva embed, or iframe", () => {
  for (const [locale, articles] of Object.entries(ARTICLES_BY_LOCALE)) {
    const blob = JSON.stringify(articles);
    assert.doesNotMatch(blob, /\.pdf/i, `${locale} references a PDF`);
    assert.doesNotMatch(blob, /canva/i, `${locale} references Canva`);
    assert.doesNotMatch(blob, /<iframe/i, `${locale} references an iframe`);
    assert.doesNotMatch(blob, /embedUrl|downloadUrl|downloadLabel/i, `${locale} keeps legacy download fields`);
  }
});

test("Persian guide screenshots point at committed web assets with alt text", () => {
  const root = path.resolve(process.cwd(), "public");
  for (const article of faGuideArticles) {
    for (const image of images(article)) {
      assert.doesNotMatch(image.src, /\.pdf$/i, `${article.slug} references a PDF image`);
      assert.ok(image.alt.trim().length > 0, `${article.slug} has an image without alt text`);
      assert.ok(existsSync(path.join(root, image.src)), `${article.slug} is missing ${image.src}`);
    }
  }
  assert.ok(images(faGuideArticles[0]).length > 0, "Persian guides should keep their screenshots");
});

test("English guides are text-only (screenshots show the Persian portal)", () => {
  for (const article of enGuideArticles) {
    assert.equal(images(article).length, 0, `en/${article.slug} unexpectedly ships a screenshot`);
  }
});
