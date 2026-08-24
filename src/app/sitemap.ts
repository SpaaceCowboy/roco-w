import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedUrl, languageAlternates } from "@/lib/seo";
import { CATEGORIES } from "@/components/pages/MarketsPage/categories";
import { getBlogPosts } from "@/lib/blog";

/** Every built route, one entry with hreflang alternates for all locales. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/accounts",
    "/social-trading",
    "/payment-methods",
    "/calendar",
    "/tools/forex-calculator",
    "/platforms/metatrader-5",
    "/promotions",
    "/about",
    "/partnership",
    "/faq",
    "/contact",
    "/legal-documents",
    "/blog",
    ...CATEGORIES.map((c) => `/markets/${c}`),
  ];
  const pages: MetadataRoute.Sitemap = paths.map((path) => ({
    url: localizedUrl(routing.defaultLocale, path),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
    alternates: { languages: languageAlternates(path) },
  }));
  const articles = ["en", "fa"].flatMap((locale) =>
    getBlogPosts(locale).map((post) => ({
      url: localizedUrl(post.locale, `/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          [post.locale]: localizedUrl(post.locale, `/blog/${post.slug}`),
          ...(post.locale === "en" ? { "x-default": localizedUrl("en", `/blog/${post.slug}`) } : {}),
        },
      },
    })),
  );
  return [...pages, ...articles];
}
