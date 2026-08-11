import type { Locale } from "@/i18n/routing";

/**
 * tawk.to live chat — carried over from the WordPress site.
 *
 * IDs come from the tawk.to dashboard: Administration → Chat Widget, where the
 * embed URL is `https://embed.tawk.to/<propertyId>/<widgetId>`. They are not
 * secrets (they ship in the page source of every tawk.to site), which is why
 * they are NEXT_PUBLIC_*.
 *
 * Widget language is a per-widget dashboard setting, not a runtime JS option.
 * If a locale gets its own widget in the dashboard, set the matching env var
 * below and the loader switches to it; anything unset falls back to the default
 * widget. `process.env.NEXT_PUBLIC_*` is inlined at build time, so each key has
 * to be spelled out statically — no dynamic lookup.
 */
export const TAWK_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? "";

const DEFAULT_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "default";

const WIDGET_BY_LOCALE: Record<Locale, string | undefined> = {
  en: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_EN,
  de: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_DE,
  ru: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_RU,
  ar: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_AR,
  fa: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_FA,
  "zh-hans": process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_ZH,
};

export function widgetIdForLocale(locale: Locale): string {
  return WIDGET_BY_LOCALE[locale] || DEFAULT_WIDGET_ID;
}
