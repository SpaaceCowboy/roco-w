import type { JSONContent } from "@tiptap/core";
import { publishedArticlePath, publishedBlogIndexPath } from "@/config/blog-routing";

const HREFLANG: Record<string, string> = { en: "en", de: "de", ru: "ru", ar: "ar", fa: "fa", "zh-hans": "zh-Hans" };

export type SeoCheck = { code: string; severity: "error" | "warning"; message: string };

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function normalizeCanonicalOverride(value: string | null, allowedHosts: ReadonlySet<string>): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("Canonical URLs must use HTTPS and cannot contain credentials or fragments");
  }
  if (!allowedHosts.has(url.hostname.toLowerCase())) throw new Error("Canonical host is not approved");
  return url.toString();
}

export function buildArticleSeo(input: {
  siteUrl: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalOverride: string | null;
  noIndex: boolean;
  noFollow: boolean;
  socialTitle: string | null;
  socialDescription: string | null;
  socialImageUrl: string | null;
  featuredImageUrl: string | null;
  authorName: string;
  publishedAt: string;
  updatedAt: string;
  translations: Array<{ locale: string; slug: string }>;
}) {
  const siteUrl = input.siteUrl.replace(/\/$/, "");
  const generatedCanonical = `${siteUrl}${publishedArticlePath(input.locale, input.slug)}`;
  const canonical = input.canonicalOverride ?? generatedCanonical;
  const title = input.seoTitle || input.title;
  const description = input.seoDescription || input.excerpt;
  const image = input.socialImageUrl || input.featuredImageUrl;
  const languages: Record<string, string> = {};
  for (const translation of input.translations) {
    const code = HREFLANG[translation.locale];
    if (code) languages[code] = `${siteUrl}${publishedArticlePath(translation.locale, translation.slug)}`;
  }
  const english = input.translations.find((translation) => translation.locale === "en");
  if (english) languages["x-default"] = `${siteUrl}${publishedArticlePath("en", english.slug)}`;
  return {
    title,
    description,
    canonical,
    robots: { index: !input.noIndex, follow: !input.noFollow },
    languages,
    openGraph: { title: input.socialTitle || title, description: input.socialDescription || description, url: canonical, image },
    twitter: { title: input.socialTitle || title, description: input.socialDescription || description, image },
    blogPosting: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: input.title,
      description,
      datePublished: input.publishedAt,
      dateModified: input.updatedAt,
      inLanguage: input.locale,
      mainEntityOfPage: canonical,
      author: { "@type": "Organization", name: input.authorName },
      ...(image ? { image } : {}),
    },
    breadcrumbs: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ROCO Broker", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}${publishedBlogIndexPath(input.locale)}` },
        { "@type": "ListItem", position: 3, name: input.title, item: canonical },
      ],
    },
  };
}

export function analyzeArticleSeo(input: {
  title: string;
  excerpt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredMediaId: string | null;
  featuredImageAlt: string;
  socialMedia: { width: number | null; height: number | null; byteSize: number } | null;
  document: JSONContent;
  duplicateTitle?: boolean;
  duplicateDescription?: boolean;
  knownInternalPaths?: ReadonlySet<string>;
}): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const effectiveTitle = input.seoTitle || input.title;
  const effectiveDescription = input.seoDescription || input.excerpt;
  if (!input.seoTitle) checks.push({ code: "seo-title-fallback", severity: "warning", message: "SEO title uses the article title." });
  if (effectiveTitle.length > 60) checks.push({ code: "seo-title-long", severity: "warning", message: "SEO title is longer than 60 characters." });
  if (!effectiveDescription) checks.push({ code: "seo-description-missing", severity: "error", message: "Add a meta description or article excerpt." });
  else if (effectiveDescription.length > 160) checks.push({ code: "seo-description-long", severity: "warning", message: "Meta description is longer than 160 characters." });
  if (input.duplicateTitle) checks.push({ code: "seo-title-duplicate", severity: "warning", message: "Another article uses this SEO title." });
  if (input.duplicateDescription) checks.push({ code: "seo-description-duplicate", severity: "warning", message: "Another article uses this meta description." });
  if (!input.featuredMediaId) checks.push({ code: "featured-image-missing", severity: "warning", message: "Add a featured image." });
  if (input.featuredMediaId && !input.featuredImageAlt.trim()) checks.push({ code: "featured-alt-missing", severity: "error", message: "Featured image alt text is required." });
  if (input.socialMedia && (input.socialMedia.width !== 1200 || input.socialMedia.height !== 630)) {
    checks.push({ code: "social-image-ratio", severity: "warning", message: "Social image should be exactly 1200×630 pixels." });
  }
  if (input.socialMedia && input.socialMedia.byteSize > 2_000_000) {
    checks.push({ code: "social-image-size", severity: "warning", message: "Social image is larger than 2 MB." });
  }

  let previousHeading = 1;
  const visit = (node: JSONContent) => {
    if (node.type === "heading") {
      const level = Number(node.attrs?.level);
      if (level > previousHeading + 1) checks.push({ code: "heading-order", severity: "warning", message: `Heading level jumps from H${previousHeading} to H${level}.` });
      previousHeading = level;
    }
    for (const mark of node.marks ?? []) {
      if (mark.type !== "link") continue;
      const href = String(mark.attrs?.href ?? "");
      const isDatabaseBlogPath = /^\/(de|ru|ar|zh-hans)\/blog\//.test(href);
      if (isDatabaseBlogPath && input.knownInternalPaths && !input.knownInternalPaths.has(href)) {
        checks.push({ code: "internal-link-broken", severity: "error", message: `Internal link does not resolve: ${href}` });
      }
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(input.document);
  return [...new Map(checks.map((check) => [`${check.code}:${check.message}`, check])).values()];
}
