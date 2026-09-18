import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { media, postLocalizations, postRevisions } from "@/db/schema";
import { getMediaPublicUrl } from "@/lib/admin/media-storage";
import { SITE_URL } from "@/config/site-url";
import { buildArticleSeo } from "./article-seo";

/** Reads the immutable published revision, never the mutable working draft. */
export async function getPublishedArticleSeo(locale: string, slug: string) {
  const [record] = await getDatabase().select({
    postId: postLocalizations.postId,
    locale: postLocalizations.locale,
    publishedAt: postLocalizations.publishedAt,
    updatedAt: postLocalizations.updatedAt,
    authorName: postLocalizations.authorName,
    slug: postRevisions.slug,
    title: postRevisions.title,
    excerpt: postRevisions.excerpt,
    seoTitle: postRevisions.seoTitle,
    seoDescription: postRevisions.seoDescription,
    canonicalOverride: postRevisions.canonicalOverride,
    noIndex: postRevisions.noIndex,
    noFollow: postRevisions.noFollow,
    socialTitle: postRevisions.socialTitle,
    socialDescription: postRevisions.socialDescription,
    socialMediaId: postRevisions.socialMediaId,
    featuredMediaId: postRevisions.featuredMediaId,
  }).from(postLocalizations)
    .innerJoin(postRevisions, and(
      eq(postRevisions.localizationId, postLocalizations.id),
      eq(postRevisions.revisionNumber, postLocalizations.publishedRevisionNumber),
    ))
    .where(and(eq(postLocalizations.locale, locale as typeof postLocalizations.$inferSelect.locale), eq(postRevisions.slug, slug), eq(postLocalizations.status, "published")))
    .limit(1);
  if (!record || !record.publishedAt) return null;

  const translations = await getDatabase().select({ locale: postLocalizations.locale, slug: postRevisions.slug })
    .from(postLocalizations)
    .innerJoin(postRevisions, and(
      eq(postRevisions.localizationId, postLocalizations.id),
      eq(postRevisions.revisionNumber, postLocalizations.publishedRevisionNumber),
    ))
    .where(and(eq(postLocalizations.postId, record.postId), eq(postLocalizations.status, "published")));
  const mediaIds = [record.socialMediaId, record.featuredMediaId].filter((id): id is string => Boolean(id));
  const mediaRecords = mediaIds.length
    ? await getDatabase().select({ id: media.id, storageKey: media.storageKey }).from(media)
      .where(and(inArray(media.id, mediaIds), isNull(media.deletedAt)))
    : [];
  const urlFor = (id: string | null) => {
    if (!id) return null;
    const item = mediaRecords.find((candidate) => candidate.id === id);
    return item ? getMediaPublicUrl(item.storageKey) : null;
  };
  return buildArticleSeo({
    siteUrl: SITE_URL,
    locale: record.locale,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    seoTitle: record.seoTitle,
    seoDescription: record.seoDescription,
    canonicalOverride: record.canonicalOverride,
    noIndex: record.noIndex,
    noFollow: record.noFollow,
    socialTitle: record.socialTitle,
    socialDescription: record.socialDescription,
    socialImageUrl: urlFor(record.socialMediaId),
    featuredImageUrl: urlFor(record.featuredMediaId),
    authorName: record.authorName,
    publishedAt: record.publishedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    translations,
  });
}

/** Shared read model for the database-backed sitemap and RSS cutover. */
export async function listIndexablePublishedRecords(locale?: string) {
  return getDatabase().select({
    postId: postLocalizations.postId,
    locale: postLocalizations.locale,
    slug: postRevisions.slug,
    title: postRevisions.title,
    excerpt: postRevisions.excerpt,
    publishedAt: postLocalizations.publishedAt,
    updatedAt: postLocalizations.updatedAt,
  }).from(postLocalizations)
    .innerJoin(postRevisions, and(
      eq(postRevisions.localizationId, postLocalizations.id),
      eq(postRevisions.revisionNumber, postLocalizations.publishedRevisionNumber),
    ))
    .where(and(
      eq(postLocalizations.status, "published"),
      eq(postRevisions.noIndex, false),
      locale ? eq(postLocalizations.locale, locale as typeof postLocalizations.$inferSelect.locale) : undefined,
    ))
    .orderBy(desc(postLocalizations.publishedAt));
}
