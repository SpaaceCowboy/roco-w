import { defineRouting } from "next-intl/routing";

/**
 * Central i18n configuration.
 *
 * `localePrefix: "as-needed"` means the default locale (English) lives at the
 * bare root (`/`, `/about`) while every other language is prefixed
 * (`/de`, `/ru/about`, ...). This mirrors the URL scheme the current WPML site
 * already uses, so existing SEO/rankings map over cleanly.
 */
export const routing = defineRouting({
  locales: ["en", "de", "ru", "ar", "fa", "zh-hans"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** Locales that render right-to-left. */
export const rtlLocales: readonly string[] = ["ar", "fa"];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale);
}
