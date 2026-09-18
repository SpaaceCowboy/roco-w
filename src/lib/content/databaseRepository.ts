import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  categories, categoryLocalizations, media, postCategories, postLocalizations,
  postRevisions, posts, postTags, tagLocalizations, tags,
} from "@/db/schema";
import { getMediaPublicUrl } from "@/lib/admin/media-storage";
import { safeDecodeURIComponent, type BlogPost, type BlogPostSummary, type BlogTaxonomy, type BlogTocItem } from "@/lib/blog";
import type { PublishedContentRepository } from "./repository";

type ContentLocale = typeof postLocalizations.$inferSelect.locale;

function asLocale(value: string): ContentLocale | null {
  return ["en", "fa", "de", "ru", "ar", "zh-hans"].includes(value) ? value as ContentLocale : null;
}

function stableSeed(value: string): number {
  let hash = 0;
  for (const character of value) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return Math.abs(hash || 1);
}

async function rowsForLocale(locale: ContentLocale, indexableOnly = false) {
  return getDatabase().select({
    postId: posts.id,
    sourceId: posts.sourceId,
    locale: postLocalizations.locale,
    publishedAt: postLocalizations.publishedAt,
    updatedAt: postLocalizations.updatedAt,
    author: postLocalizations.authorName,
    readingMinutes: postLocalizations.readingMinutes,
    slug: postRevisions.slug,
    title: postRevisions.title,
    excerpt: postRevisions.excerpt,
    contentHtml: postRevisions.renderedHtml,
    featuredMediaId: postRevisions.featuredMediaId,
    featuredImageAlt: postRevisions.featuredImageAlt,
    metadata: postRevisions.metadata,
  }).from(postLocalizations)
    .innerJoin(posts, eq(posts.id, postLocalizations.postId))
    .innerJoin(postRevisions, and(
      eq(postRevisions.localizationId, postLocalizations.id),
      eq(postRevisions.revisionNumber, postLocalizations.publishedRevisionNumber),
    ))
    .where(and(
      eq(postLocalizations.locale, locale), eq(postLocalizations.status, "published"), isNull(posts.deletedAt),
      indexableOnly ? eq(postRevisions.noIndex, false) : undefined,
    ))
    .orderBy(desc(postLocalizations.publishedAt));
}

async function hydrate(locale: ContentLocale, indexableOnly = false): Promise<BlogPost[]> {
  const rows = await rowsForLocale(locale, indexableOnly);
  if (!rows.length) return [];
  const postIds = rows.map((row) => row.postId);
  const mediaIds = rows.map((row) => row.featuredMediaId).filter((id): id is string => Boolean(id));
  const [categoryRows, tagRows, mediaRows] = await Promise.all([
    getDatabase().select({ postId: postCategories.postId, slug: categoryLocalizations.slug, name: categoryLocalizations.name })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .innerJoin(categoryLocalizations, and(eq(categoryLocalizations.categoryId, categories.id), eq(categoryLocalizations.locale, locale)))
      .where(inArray(postCategories.postId, postIds)),
    getDatabase().select({ postId: postTags.postId, slug: tagLocalizations.slug, name: tagLocalizations.name })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .innerJoin(tagLocalizations, and(eq(tagLocalizations.tagId, tags.id), eq(tagLocalizations.locale, locale)))
      .where(inArray(postTags.postId, postIds)),
    mediaIds.length
      ? getDatabase().select({ id: media.id, storageKey: media.storageKey, width: media.width, height: media.height })
        .from(media).where(and(inArray(media.id, mediaIds), isNull(media.deletedAt)))
      : Promise.resolve([]),
  ]);

  return rows.map((row) => {
    const category = categoryRows.find((item) => item.postId === row.postId);
    const image = mediaRows.find((item) => item.id === row.featuredMediaId);
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
    const toc = Array.isArray(metadata.tableOfContents) ? metadata.tableOfContents as BlogTocItem[] : [];
    const importedCategory = metadata.category && typeof metadata.category === "object"
      ? metadata.category as BlogTaxonomy : null;
    const importedTags = Array.isArray(metadata.tags) ? metadata.tags as BlogTaxonomy[] : null;
    return {
      sourceId: row.sourceId ?? stableSeed(row.postId),
      locale: row.locale,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      category: importedCategory ?? (category ? { slug: category.slug, name: category.name } : { slug: "uncategorized", name: "Uncategorized" }),
      tags: importedTags ?? tagRows.filter((item) => item.postId === row.postId).map(({ slug, name }) => ({ slug, name })),
      publishedAt: row.publishedAt!.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: row.author,
      readingMinutes: row.readingMinutes,
      featuredImage: image ? getMediaPublicUrl(image.storageKey) : "",
      featuredImageAlt: row.featuredImageAlt,
      featuredImageWidth: image?.width ?? 0,
      featuredImageHeight: image?.height ?? 0,
      contentHtml: row.contentHtml,
      tableOfContents: toc,
    } satisfies BlogPost;
  });
}

function summaries(posts: BlogPost[]): BlogPostSummary[] {
  return posts.map((post) => ({
    sourceId: post.sourceId,
    locale: post.locale,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: post.author,
    readingMinutes: post.readingMinutes,
    featuredImage: post.featuredImage,
    featuredImageAlt: post.featuredImageAlt,
    featuredImageWidth: post.featuredImageWidth,
    featuredImageHeight: post.featuredImageHeight,
  }));
}

async function preferredPosts(locale: string): Promise<BlogPost[]> {
  const requested = asLocale(locale);
  if (requested) {
    const native = await hydrate(requested);
    if (native.length) return native;
  }
  return requested === "en" ? [] : hydrate("en");
}

function taxonomies(posts: BlogPost[], key: "category" | "tags", locale: string): BlogTaxonomy[] {
  const values = new Map<string, BlogTaxonomy>();
  for (const post of posts) {
    const items = key === "category" ? [post.category] : post.tags;
    for (const item of items) values.set(item.slug, item);
  }
  return [...values.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
}

export const databasePublishedContentRepository: PublishedContentRepository = {
  async listPosts(locale) {
    return summaries(await preferredPosts(locale));
  },
  async listIndexablePosts(locale) {
    const requested = asLocale(locale);
    if (requested) {
      const native = await hydrate(requested, true);
      if (native.length || (await rowsForLocale(requested)).length) return summaries(native);
    }
    return requested === "en" ? [] : summaries(await hydrate("en", true));
  },
  async findPost(locale, slug) {
    const decoded = safeDecodeURIComponent(slug);
    const requested = asLocale(locale);
    if (requested) {
      const post = (await hydrate(requested)).find((item) => item.slug === decoded);
      if (post) return post;
    }
    if (requested !== "en") return (await hydrate("en")).find((item) => item.slug === decoded);
  },
  async listRelatedPosts(post, limit = 3) {
    return summaries(await hydrate(post.locale))
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => ({
        candidate,
        score: (candidate.category.slug === post.category.slug ? 5 : 0) +
          candidate.tags.filter((tag) => post.tags.some((item) => item.slug === tag.slug)).length,
      }))
      .sort((a, b) => b.score - a.score || b.candidate.publishedAt.localeCompare(a.candidate.publishedAt))
      .slice(0, limit).map(({ candidate }) => candidate);
  },
  async listCategories(locale) {
    return taxonomies(await preferredPosts(locale), "category", locale);
  },
  async listTags(locale) {
    return taxonomies(await preferredPosts(locale), "tags", locale);
  },
  async hasNativeContent(locale) {
    const requested = asLocale(locale);
    return requested ? (await rowsForLocale(requested)).length > 0 : false;
  },
  async listStaticParams() {
    const locales: ContentLocale[] = ["en", "fa", "de", "ru", "ar", "zh-hans"];
    const records = (await Promise.all(locales.map((locale) => hydrate(locale)))).flat();
    return records.map((post) => ({ locale: post.locale, slug: post.slug }));
  },
};
