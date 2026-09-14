import type { Locale } from "@/i18n/routing";

export type LiveChatProvider = "tawk" | "chatwoot" | "crisp";

/**
 * Only one provider is loaded. Chatwoot is the production provider; Tawk and
 * Crisp remain available when explicitly selected for rollback or testing.
 */
const configuredProvider = process.env.NEXT_PUBLIC_LIVE_CHAT_PROVIDER?.toLowerCase();
export const LIVE_CHAT_PROVIDER: LiveChatProvider =
  configuredProvider === "chatwoot" || configuredProvider === "crisp"
    ? configuredProvider
    : "chatwoot";

/** Public IDs from the tawk.to dashboard embed URL. */
export const TAWK_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID || "";

const DEFAULT_TAWK_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "default";

const TAWK_WIDGET_BY_LOCALE: Record<Locale, string | undefined> = {
  en: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_EN,
  de: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_DE,
  ru: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_RU,
  ar: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_AR,
  fa: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_FA,
  "zh-hans": process.env.NEXT_PUBLIC_TAWK_WIDGET_ID_ZH,
};

export function tawkWidgetIdForLocale(locale: Locale): string {
  return TAWK_WIDGET_BY_LOCALE[locale] || DEFAULT_TAWK_WIDGET_ID;
}

/** Public values from Chatwoot → Settings → Inboxes → Website → Configuration. */
export const CHATWOOT_BASE_URL = (
  process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "https://support.rocobroker.com"
).replace(/\/$/, "");

export const CHATWOOT_WEBSITE_TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN || "";

/** Public Website ID from Crisp → Settings → Workspace Settings → Setup & Integrations. */
export const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || "";

export function chatwootLocale(locale: Locale): string {
  return locale === "zh-hans" ? "zh_CN" : locale;
}

/** Crisp expects an ISO 639-1 locale code. */
export function crispLocale(locale: Locale): string {
  return locale === "zh-hans" ? "zh" : locale;
}
