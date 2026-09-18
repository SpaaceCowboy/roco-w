import { generateJSON } from "@tiptap/html/server";
import { eq, inArray, sql } from "drizzle-orm";
import source from "../src/content/blog/posts.json";
import { closeDatabase, getDatabase } from "../src/db/client";
import { postLocalizations, postSlugHistory, posts } from "../src/db/schema";
import { publishedArticlePath } from "../src/config/blog-routing";
import { collectPlainText, normalizeHeadingIds, renderEditorDocument } from "../src/lib/content/editor/document";
import { editorExtensions } from "../src/lib/content/editor/extensions";
import { databasePublishedContentRepository } from "../src/lib/content/databaseRepository";
import { listIndexablePublishedRecords } from "../src/lib/content/published-seo";
import type { BlogPost } from "../src/lib/blog";

type Mismatch = { sourceId: number | null; field: string; expected: unknown; actual: unknown };

/**
 * Canonicalize a value so object key order no longer matters. PostgreSQL
 * `jsonb` stores object keys in its own order, so a value round-tripped through
 * the database can differ from the source only by key order. Comparing
 * serialized JSON directly would flag that as a mismatch, so both sides are
 * canonicalized (keys sorted) before comparison.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record).sort().reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonical(record[key]);
      return acc;
    }, {});
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function sourceText(html: string): string {
  return collectPlainText(generateJSON(html, editorExtensions));
}

function normalizedHtml(html: string): string {
  return renderEditorDocument(normalizeHeadingIds(generateJSON(html, editorExtensions))).html;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for content parity verification");
  if (!process.env.CONTENT_MEDIA_PUBLIC_BASE_URL) throw new Error("CONTENT_MEDIA_PUBLIC_BASE_URL is required for content parity verification");

  const expected = source.posts as BlogPost[];
  const actual = (await Promise.all(expected.map((post) =>
    databasePublishedContentRepository.findPost(post.locale, post.slug),
  ))).filter((post): post is BlogPost => Boolean(post));
  const actualBySourceId = new Map(actual.map((post) => [post.sourceId, post]));
  const mismatches: Mismatch[] = [];
  const compare = (sourceId: number, field: string, expectedValue: unknown, actualValue: unknown) => {
    if (!sameJson(expectedValue, actualValue)) mismatches.push({ sourceId, field, expected: expectedValue, actual: actualValue });
  };

  compare(0, "article-count", expected.length, actual.length);
  for (const sourcePost of expected) {
    const databasePost = actualBySourceId.get(sourcePost.sourceId);
    if (!databasePost) {
      mismatches.push({ sourceId: sourcePost.sourceId, field: "article", expected: "present", actual: "missing" });
      continue;
    }
    compare(sourcePost.sourceId, "locale", sourcePost.locale, databasePost.locale);
    compare(sourcePost.sourceId, "slug", sourcePost.slug, databasePost.slug);
    compare(sourcePost.sourceId, "public-url", publishedArticlePath(sourcePost.locale, sourcePost.slug), publishedArticlePath(databasePost.locale, databasePost.slug));
    compare(sourcePost.sourceId, "title", sourcePost.title, databasePost.title);
    compare(sourcePost.sourceId, "excerpt", sourcePost.excerpt, databasePost.excerpt);
    compare(sourcePost.sourceId, "author", sourcePost.author, databasePost.author);
    compare(sourcePost.sourceId, "published-at", new Date(sourcePost.publishedAt).getTime(), new Date(databasePost.publishedAt).getTime());
    compare(sourcePost.sourceId, "updated-at", new Date(sourcePost.updatedAt).getTime(), new Date(databasePost.updatedAt).getTime());
    compare(sourcePost.sourceId, "reading-minutes", sourcePost.readingMinutes, databasePost.readingMinutes);
    compare(sourcePost.sourceId, "category", sourcePost.category, databasePost.category);
    compare(sourcePost.sourceId, "tags", sourcePost.tags, databasePost.tags);
    compare(sourcePost.sourceId, "featured-alt", sourcePost.featuredImageAlt, databasePost.featuredImageAlt);
    compare(sourcePost.sourceId, "featured-width", sourcePost.featuredImageWidth, databasePost.featuredImageWidth);
    compare(sourcePost.sourceId, "featured-height", sourcePost.featuredImageHeight, databasePost.featuredImageHeight);
    compare(sourcePost.sourceId, "featured-public-url", true, databasePost.featuredImage.startsWith("https://"));
    compare(sourcePost.sourceId, "table-of-contents", sourcePost.tableOfContents, databasePost.tableOfContents);
    compare(sourcePost.sourceId, "normalized-html", normalizedHtml(sourcePost.contentHtml), databasePost.contentHtml);
    compare(sourcePost.sourceId, "plain-text", sourceText(sourcePost.contentHtml), sourceText(databasePost.contentHtml));
  }

  const sourceIds = expected.map((post) => post.sourceId);
  const [indexable, history, importedRows] = await Promise.all([
    listIndexablePublishedRecords(),
    getDatabase().select({ count: sql<number>`count(*)::int` }).from(postSlugHistory)
      .innerJoin(postLocalizations, eq(postLocalizations.id, postSlugHistory.localizationId))
      .innerJoin(posts, eq(posts.id, postLocalizations.postId))
      .where(inArray(posts.sourceId, sourceIds)),
    getDatabase().select({ sourceId: posts.sourceId, status: postLocalizations.status })
      .from(posts).innerJoin(postLocalizations, eq(postLocalizations.postId, posts.id))
      .where(inArray(posts.sourceId, sourceIds)),
  ]);
  compare(0, "indexable-count", expected.length, indexable.length);
  compare(0, "initial-slug-history-count", 0, history[0]?.count ?? 0);
  compare(0, "published-import-count", expected.length, importedRows.filter((row) => row.status === "published").length);

  const summary = {
    expected: expected.length,
    actual: actual.length,
    indexable: indexable.length,
    mismatches: mismatches.length,
    mismatchFields: Object.fromEntries([...new Set(mismatches.map((item) => item.field))]
      .map((field) => [field, mismatches.filter((item) => item.field === field).length])),
  };
  console.log(JSON.stringify({ summary, mismatches: mismatches.slice(0, 100) }, null, 2));
  if (mismatches.length) process.exitCode = 1;
  await closeDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabase();
  process.exitCode = 1;
});
