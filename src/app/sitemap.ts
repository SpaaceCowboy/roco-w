import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedUrl, languageAlternates } from "@/lib/seo";
import { CATEGORIES } from "@/components/pages/MarketsPage/categories";

/** Every built route, one entry with hreflang alternates for all locales. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/accounts",
    "/social-trading",
    "/payment-methods",
    "/calendar",
    "/platforms/metatrader-5",
    "/promotions",
    "/about",
    "/partnership",
    "/faq",
    "/contact",
    "/legal-documents",
    ...CATEGORIES.map((c) => `/markets/${c}`),
  ];
  return paths.map((path) => ({
    url: localizedUrl(routing.defaultLocale, path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
    alternates: { languages: languageAlternates(path) },
  }));
}
