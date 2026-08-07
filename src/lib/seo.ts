import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/** Production origin — override per environment with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://rocobroker.com").replace(
  /\/$/,
  "",
);

/** Default social share image (1200×630, relative to SITE_URL via metadataBase). */
export const OG_IMAGE = "/Banner.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * hreflang codes — deliberately LANGUAGE-ONLY (no country/region subtag). Each
 * locale therefore targets speakers of that language *worldwide*, not a country.
 * In particular `ru` reaches Russian-speakers anywhere; it is not geo-targeted
 * to any country. `zh-hans` uses the script subtag `zh-Hans` (Simplified), which
 * is a script, not a region.
 */
const HREFLANG: Record<string, string> = {
  en: "en",
  de: "de",
  ru: "ru",
  ar: "ar",
  fa: "fa",
  "zh-hans": "zh-Hans",
};

/** Path for a locale under the `as-needed` prefix scheme (default = no prefix). */
export function localizedPath(locale: string, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

export function localizedUrl(locale: string, path: string): string {
  return `${SITE_URL}${localizedPath(locale, path)}`;
}

/** hreflang alternates for a path (every locale + x-default → default locale). */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[HREFLANG[l]] = localizedUrl(l, path);
  languages["x-default"] = localizedUrl(routing.defaultLocale, path);
  return languages;
}

/**
 * Build a page's Metadata: canonical + hreflang alternates, OpenGraph and
 * Twitter cards. `og:locale` is intentionally omitted — OpenGraph only models
 * `language_TERRITORY`, which would imply a country; the country-neutral
 * language signal lives in hreflang and `<html lang>` instead.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = localizedUrl(locale, path);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "ROCO Broker",
      title,
      description,
      url,
      images: [{ url: OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: "ROCO Broker" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}
