import type { JSONContent } from "@tiptap/core";
import { and, eq } from "drizzle-orm";
import source from "../src/content/blog/posts.json";
import { closeDatabase, getDatabase } from "../src/db/client";
import { media, mediaUsages, postLocalizations, postRevisions, posts } from "../src/db/schema";
import { getMediaPublicUrl } from "../src/lib/admin/media-storage";
import { collectInlineMedia } from "../src/lib/content/editor/document";
import type { BlogPost } from "../src/lib/blog";

type Problem = {
  localizationId: string;
  locale: string;
  slug: string;
  scope: "draft" | "published";
  code: string;
  mediaId?: string;
};

function attribute(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  const value = match?.[1] ?? match?.[2] ?? "";
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith("#")) {
      const hexadecimal = key[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

function renderedImages(html: string) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => ({
    mediaId: attribute(match[0], "data-media-id"),
    alt: attribute(match[0], "alt"),
    src: attribute(match[0], "src"),
    title: attribute(match[0], "title"),
    width: Number(attribute(match[0], "width")) || null,
    height: Number(attribute(match[0], "height")) || null,
  }));
}

function key(item: { mediaId: string; alt: string; src: string; title: string; width: number | null; height: number | null }): string {
  return [item.mediaId, item.alt, item.src, item.title, item.width ?? "", item.height ?? ""].join("\u0000");
}

function compareDocumentToHtml(document: JSONContent, html: string, report: (code: string, mediaId?: string) => void) {
  const documentImages = collectInlineMedia(document);
  const htmlImages = renderedImages(html);
  const htmlCounts = new Map<string, number>();
  for (const item of htmlImages) {
    const itemKey = key(item);
    htmlCounts.set(itemKey, (htmlCounts.get(itemKey) ?? 0) + 1);
  }
  for (const item of documentImages) {
    const itemKey = key(item);
    const count = htmlCounts.get(itemKey) ?? 0;
    if (!count) report("rendered-image-missing-or-changed", item.mediaId);
    else htmlCounts.set(itemKey, count - 1);
  }
  if ([...htmlCounts.values()].some((count) => count > 0)) report("rendered-html-has-untracked-image");
  return documentImages;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the inline-media audit");
  if (!process.env.CONTENT_MEDIA_PUBLIC_BASE_URL) throw new Error("CONTENT_MEDIA_PUBLIC_BASE_URL is required for the inline-media audit");

  const db = getDatabase();
  const [localizations, mediaRows, usageRows, publishedRows] = await Promise.all([
    db.select({
      id: postLocalizations.id,
      sourceId: posts.sourceId,
      locale: postLocalizations.locale,
      slug: postLocalizations.slug,
      publishedRevisionNumber: postLocalizations.publishedRevisionNumber,
      document: postLocalizations.editorDocument,
      html: postLocalizations.renderedHtml,
    }).from(postLocalizations).innerJoin(posts, eq(posts.id, postLocalizations.postId)),
    db.select({ id: media.id, storageKey: media.storageKey, deletedAt: media.deletedAt }).from(media),
    db.select({
      localizationId: mediaUsages.localizationId,
      mediaId: mediaUsages.mediaId,
      kind: mediaUsages.kind,
      altText: mediaUsages.altText,
    }).from(mediaUsages),
    db.select({
      localizationId: postLocalizations.id,
      locale: postLocalizations.locale,
      slug: postLocalizations.slug,
      revisionNumber: postRevisions.revisionNumber,
      document: postRevisions.editorDocument,
      html: postRevisions.renderedHtml,
    }).from(postLocalizations).innerJoin(postRevisions, and(
      eq(postRevisions.localizationId, postLocalizations.id),
      eq(postRevisions.revisionNumber, postLocalizations.publishedRevisionNumber),
    )),
  ]);

  const mediaById = new Map(mediaRows.map((item) => [item.id, item]));
  const inlineUsageByLocalization = new Map<string, Map<string, string>>();
  for (const usage of usageRows) {
    if (usage.kind !== "inline") continue;
    const usages = inlineUsageByLocalization.get(usage.localizationId) ?? new Map<string, string>();
    usages.set(usage.mediaId, usage.altText);
    inlineUsageByLocalization.set(usage.localizationId, usages);
  }
  const problems: Problem[] = [];
  let draftImages = 0;
  let publishedImages = 0;

  for (const localization of localizations) {
    const report = (scope: Problem["scope"]) => (code: string, mediaId?: string) => {
      problems.push({ localizationId: localization.id, locale: localization.locale, slug: localization.slug, scope, code, mediaId });
    };
    const draft = compareDocumentToHtml(localization.document as JSONContent, localization.html, report("draft"));
    draftImages += draft.length;
    const expectedUsage = new Map<string, string>();
    for (const image of draft) {
      expectedUsage.set(image.mediaId, image.alt);
      const item = mediaById.get(image.mediaId);
      if (!item) report("draft")("media-record-missing", image.mediaId);
      else if (item.deletedAt) report("draft")("media-record-deleted", image.mediaId);
      else if (image.src !== getMediaPublicUrl(item.storageKey)) report("draft")("media-source-not-canonical", image.mediaId);
    }
    const actualUsage = inlineUsageByLocalization.get(localization.id) ?? new Map<string, string>();
    for (const [mediaId, alt] of expectedUsage) {
      if (!actualUsage.has(mediaId)) report("draft")("inline-usage-missing", mediaId);
      else if (actualUsage.get(mediaId) !== alt) report("draft")("inline-usage-alt-mismatch", mediaId);
    }
    for (const mediaId of actualUsage.keys()) {
      if (!expectedUsage.has(mediaId)) report("draft")("orphaned-inline-usage", mediaId);
    }
  }

  for (const revision of publishedRows) {
    const report = (code: string, mediaId?: string) => problems.push({
      localizationId: revision.localizationId,
      locale: revision.locale,
      slug: revision.slug,
      scope: "published",
      code,
      mediaId,
    });
    const images = compareDocumentToHtml(revision.document as JSONContent, revision.html, report);
    publishedImages += images.length;
    for (const image of images) {
      const item = mediaById.get(image.mediaId);
      if (!item) report("media-record-missing", image.mediaId);
      else if (item.deletedAt) report("media-record-deleted", image.mediaId);
      else if (image.src !== getMediaPublicUrl(item.storageKey)) report("media-source-not-canonical", image.mediaId);
    }
  }

  const sourcePosts = source.posts as BlogPost[];
  const legacySnapshotImages = sourcePosts.reduce((count, post) => count + renderedImages(post.contentHtml).length, 0);
  const summary = {
    sourcePosts: sourcePosts.length,
    legacySnapshotImages,
    localizations: localizations.length,
    draftImages,
    publishedImages,
    problems: problems.length,
    problemCodes: Object.fromEntries([...new Set(problems.map((problem) => problem.code))]
      .map((code) => [code, problems.filter((problem) => problem.code === code).length])),
  };
  console.log(JSON.stringify({ summary, problems: problems.slice(0, 200) }, null, 2));
  if (problems.length) process.exitCode = 1;
  await closeDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabase();
  process.exitCode = 1;
});
