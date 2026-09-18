import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedUrl, languageAlternates } from "@/lib/seo";
import { CATEGORIES } from "@/components/pages/MarketsPage/categories";
import { getPublishedContentRepository } from "@/lib/content/content-source";
import { publishedArticlePath } from "@/config/blog-routing";
import { SITE_URL } from "@/config/site-url";

/** Every built route, one entry with hreflang alternates for all locales. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [
    "/",
    "/accounts",
    "/swap-free-account",
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
  const repository = getPublishedContentRepository();
  const articles = (await Promise.all(routing.locales.map((locale) => repository.listIndexablePosts(locale))))
    .flat()
    .filter((post, index, all) => all.findIndex((candidate) => candidate.locale === post.locale && candidate.slug === post.slug) === index)
    .map((post) => ({
      url: `${SITE_URL}${publishedArticlePath(post.locale, post.slug)}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          [post.locale]: `${SITE_URL}${publishedArticlePath(post.locale, post.slug)}`,
          ...(post.locale === "en" ? { "x-default": `${SITE_URL}${publishedArticlePath("en", post.slug)}` } : {}),
        },
      },
    }));
  return [...pages, ...articles];
}
