import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateJSON } from "@tiptap/html/server";
import { and, eq } from "drizzle-orm";
import source from "../src/content/blog/posts.json";
import { closeDatabase, getDatabase } from "../src/db/client";
import {
  auditEvents, categories, categoryLocalizations, mediaUsages, postCategories, postLocalizations,
  postRevisions, posts, postTags, tagLocalizations, tags,
} from "../src/db/schema";
import { importTrustedMedia } from "../src/lib/admin/media-storage";
import { editorExtensions } from "../src/lib/content/editor/extensions";
import { collectPlainText, normalizeHeadingIds, renderEditorDocument } from "../src/lib/content/editor/document";
import type { BlogPost } from "../src/lib/blog";

type ImportResult = {
  sourceId: number;
  locale: string;
  slug: string;
  outcome: "created" | "skipped" | "would-create" | "failed";
  htmlChanged: boolean;
  originalBytes: number;
  renderedBytes: number;
  rejectedPatterns: string[];
  removedTags: string[];
  lostHeadingIds: string[];
  textChanged: boolean;
  error?: string;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const summaryOnly = process.argv.includes("--summary-only");

function fingerprint(post: BlogPost, renderedHtml: string): string {
  return createHash("sha256").update(JSON.stringify({
    sourceId: post.sourceId, locale: post.locale, slug: post.slug, title: post.title,
    excerpt: post.excerpt, category: post.category, tags: post.tags,
    publishedAt: post.publishedAt, updatedAt: post.updatedAt, author: post.author,
    readingMinutes: post.readingMinutes, featuredImage: post.featuredImage,
    featuredImageAlt: post.featuredImageAlt, contentHtml: renderedHtml,
  })).digest("hex");
}

function rejectedPatterns(html: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["script", /<script\b/i], ["iframe", /<iframe\b/i], ["inline-event", /\son[a-z]+\s*=/i],
    ["inline-style", /\sstyle\s*=/i], ["javascript-url", /javascript\s*:/i],
  ];
  return checks.filter(([, pattern]) => pattern.test(html)).map(([name]) => name);
}

function tagsIn(html: string): Set<string> {
  return new Set([...html.matchAll(/<\/?([a-z0-9-]+)/gi)].map((match) => match[1].toLowerCase()));
}

function headingIdsIn(html: string): Set<string> {
  return new Set([...html.matchAll(/<h[2-4][^>]*\sid=["']([^"']+)["']/gi)].map((match) => match[1]));
}

async function importPost(post: BlogPost): Promise<ImportResult> {
  const document = normalizeHeadingIds(generateJSON(post.contentHtml, editorExtensions));
  const { html: renderedHtml } = renderEditorDocument(document);
  const renderedDocument = generateJSON(renderedHtml, editorExtensions);
  const sourceText = collectPlainText(document);
  const renderedText = collectPlainText(renderedDocument);
  const result: ImportResult = {
    sourceId: post.sourceId,
    locale: post.locale,
    slug: post.slug,
    outcome: dryRun ? "would-create" : "created",
    htmlChanged: renderedHtml !== post.contentHtml,
    originalBytes: Buffer.byteLength(post.contentHtml),
    renderedBytes: Buffer.byteLength(renderedHtml),
    rejectedPatterns: rejectedPatterns(post.contentHtml),
    removedTags: [...tagsIn(post.contentHtml)].filter((tag) => !tagsIn(renderedHtml).has(tag)).sort(),
    lostHeadingIds: [...headingIdsIn(post.contentHtml)].filter((id) => !headingIdsIn(renderedHtml).has(id)).sort(),
    textChanged: sourceText !== renderedText,
  };
  if (dryRun) return result;

  const importFingerprint = fingerprint(post, renderedHtml);
  const db = getDatabase();
  const [existingPost] = await db.select({ id: posts.id }).from(posts).where(eq(posts.sourceId, post.sourceId)).limit(1);
  if (existingPost) {
    const revisions = await db.select({ metadata: postRevisions.metadata }).from(postRevisions)
      .innerJoin(postLocalizations, eq(postLocalizations.id, postRevisions.localizationId))
      .where(and(eq(postLocalizations.postId, existingPost.id), eq(postLocalizations.locale, post.locale)));
    if (revisions.some((revision) => (revision.metadata as Record<string, unknown>)?.importFingerprint === importFingerprint)) {
      return { ...result, outcome: "skipped" };
    }
    throw new Error(`sourceId ${post.sourceId} already exists without this import fingerprint; refusing to overwrite editorial content`);
  }

  const imagePath = path.join(projectRoot, "public", post.featuredImage.replace(/^\//, ""));
  const imageBytes = await readFile(imagePath);
  const featuredMedia = await importTrustedMedia({
    bytes: imageBytes,
    filename: path.basename(imagePath),
    storageKey: `content/imported/${post.sourceId}.webp`,
    mimeType: "image/webp",
  });

  await db.transaction(async (tx) => {
    const [createdPost] = await tx.insert(posts).values({
      sourceId: post.sourceId,
      defaultLocale: post.locale,
      createdAt: new Date(post.publishedAt),
      updatedAt: new Date(post.updatedAt),
    }).returning();
    const [localization] = await tx.insert(postLocalizations).values({
      postId: createdPost.id,
      locale: post.locale,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      editorDocument: document,
      renderedHtml,
      status: "published",
      version: 1,
      publishedRevisionNumber: 1,
      authorName: post.author,
      readingMinutes: post.readingMinutes,
      featuredMediaId: featuredMedia.id,
      featuredImageAlt: post.featuredImageAlt,
      publishedAt: new Date(post.publishedAt),
      createdAt: new Date(post.publishedAt),
      updatedAt: new Date(post.updatedAt),
    }).returning();
    await tx.insert(postRevisions).values({
      localizationId: localization.id,
      revisionNumber: 1,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      editorDocument: document,
      renderedHtml,
      featuredMediaId: featuredMedia.id,
      featuredImageAlt: post.featuredImageAlt,
      metadata: {
        reason: "legacy-import", importFingerprint, sourceId: post.sourceId,
        authorName: post.author, readingMinutes: post.readingMinutes,
        tableOfContents: post.tableOfContents, category: post.category, tags: post.tags,
      },
    });
    await tx.insert(mediaUsages).values({
      mediaId: featuredMedia.id,
      localizationId: localization.id,
      kind: "featured",
      altText: post.featuredImageAlt,
    });

    let [category] = await tx.select({ id: categoryLocalizations.categoryId }).from(categoryLocalizations)
      .where(and(eq(categoryLocalizations.locale, post.locale), eq(categoryLocalizations.slug, post.category.slug))).limit(1);
    if (!category) {
      const [created] = await tx.insert(categories).values({}).returning({ id: categories.id });
      await tx.insert(categoryLocalizations).values({ categoryId: created.id, locale: post.locale, slug: post.category.slug, name: post.category.name });
      category = created;
    }
    await tx.insert(postCategories).values({ postId: createdPost.id, categoryId: category.id });

    for (const sourceTag of post.tags) {
      let [tag] = await tx.select({ id: tagLocalizations.tagId }).from(tagLocalizations)
        .where(and(eq(tagLocalizations.locale, post.locale), eq(tagLocalizations.slug, sourceTag.slug))).limit(1);
      if (!tag) {
        const [created] = await tx.insert(tags).values({}).returning({ id: tags.id });
        await tx.insert(tagLocalizations).values({ tagId: created.id, locale: post.locale, slug: sourceTag.slug, name: sourceTag.name });
        tag = created;
      }
      await tx.insert(postTags).values({ postId: createdPost.id, tagId: tag.id });
    }
    await tx.insert(auditEvents).values({
      action: "content.import",
      entityType: "post_localization",
      entityId: localization.id,
      outcome: "success",
      correlationId: crypto.randomUUID(),
      metadata: { sourceId: post.sourceId, locale: post.locale, htmlChanged: result.htmlChanged },
    });
  });
  return result;
}

async function main() {
  const results: ImportResult[] = [];
  for (const post of source.posts as BlogPost[]) {
    try {
      results.push(await importPost(post));
    } catch (error) {
      results.push({
        sourceId: post.sourceId, locale: post.locale, slug: post.slug, outcome: "failed",
        htmlChanged: false, originalBytes: Buffer.byteLength(post.contentHtml), renderedBytes: 0,
        rejectedPatterns: rejectedPatterns(post.contentHtml), error: error instanceof Error ? error.message : "Unknown error",
        removedTags: [], lostHeadingIds: [], textChanged: false,
      });
    }
  }
  const summary = {
    dryRun,
    total: results.length,
    created: results.filter((item) => item.outcome === "created").length,
    skipped: results.filter((item) => item.outcome === "skipped").length,
    wouldCreate: results.filter((item) => item.outcome === "would-create").length,
    failed: results.filter((item) => item.outcome === "failed").length,
    htmlChanged: results.filter((item) => item.htmlChanged).length,
    rejectedPatternCounts: Object.fromEntries([...new Set(results.flatMap((item) => item.rejectedPatterns))].map((pattern) => [pattern, results.filter((item) => item.rejectedPatterns.includes(pattern)).length])),
    removedTagCounts: Object.fromEntries([...new Set(results.flatMap((item) => item.removedTags))].map((tag) => [tag, results.filter((item) => item.removedTags.includes(tag)).length])),
    postsWithLostHeadingIds: results.filter((item) => item.lostHeadingIds.length).length,
    postsWithTextChanges: results.filter((item) => item.textChanged).length,
  };
  console.log(JSON.stringify(summaryOnly ? { summary } : { summary, results }, null, 2));
  if (summary.failed) process.exitCode = 1;
  await closeDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabase();
  process.exitCode = 1;
});
