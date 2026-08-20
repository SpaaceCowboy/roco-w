import data from "@/content/blog/posts.json";
import { routing, type Locale } from "@/i18n/routing";

export type BlogTaxonomy = { slug: string; name: string };
export type BlogTocItem = { level: number; id: string; label: string };

export type BlogPost = {
  sourceId: number;
  locale: "en" | "fa";
  slug: string;
  title: string;
  excerpt: string;
  category: BlogTaxonomy;
  tags: BlogTaxonomy[];
  publishedAt: string;
  updatedAt: string;
  author: string;
  readingMinutes: number;
  featuredImage: string;
  featuredImageAlt: string;
  featuredImageWidth: number;
  featuredImageHeight: number;
  contentHtml: string;
  tableOfContents: BlogTocItem[];
};

export type BlogPostSummary = Omit<BlogPost, "contentHtml" | "tableOfContents">;

const posts = data.posts as BlogPost[];

/** The legacy editorial library contains English and Persian source content. */
export function contentLocaleFor(locale: string): BlogPost["locale"] {
  return locale === "fa" ? "fa" : "en";
}

export function hasNativeBlogContent(locale: string): boolean {
  return locale === "en" || locale === "fa";
}

export function getBlogPosts(locale: string): BlogPost[] {
  const contentLocale = contentLocaleFor(locale);
  return posts.filter((post) => post.locale === contentLocale);
}

export function getBlogPostSummaries(locale: string): BlogPostSummary[] {
  return getBlogPosts(locale).map((post) => ({
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

export function getBlogPost(locale: string, slug: string): BlogPost | undefined {
  const decoded = safeDecodeURIComponent(slug);
  const preferred = getBlogPosts(locale).find((post) => post.slug === decoded);
  if (preferred) return preferred;
  // A visitor can carry a Persian locale cookie into an old unprefixed English
  // article redirect. Keep that legacy article readable in the localized shell.
  return posts.find((post) => post.locale === "en" && post.slug === decoded);
}

export function getRelatedBlogPosts(post: BlogPost, limit = 3): BlogPostSummary[] {
  return getBlogPostSummaries(post.locale)
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      candidate,
      score:
        (candidate.category.slug === post.category.slug ? 5 : 0) +
        candidate.tags.filter((tag) => post.tags.some((item) => item.slug === tag.slug)).length,
    }))
    .sort((a, b) => b.score - a.score || b.candidate.publishedAt.localeCompare(a.candidate.publishedAt))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function getBlogCategories(locale: string): BlogTaxonomy[] {
  const categories = new Map<string, BlogTaxonomy>();
  for (const post of getBlogPosts(locale)) categories.set(post.category.slug, post.category);
  return [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, contentLocaleFor(locale)));
}

export function getBlogTags(locale: string): BlogTaxonomy[] {
  const tags = new Map<string, BlogTaxonomy>();
  for (const post of getBlogPosts(locale)) {
    for (const tag of post.tags) tags.set(tag.slug, tag);
  }
  return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, contentLocaleFor(locale)));
}

export function getBlogStaticParams(): Array<{ locale: Locale; slug: string }> {
  return routing.locales.flatMap((locale) =>
    [...getBlogPosts(locale), ...(locale === "fa" ? getBlogPosts("en") : [])].map((post) => ({
      locale,
      slug: post.slug,
    })),
  );
}

export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
