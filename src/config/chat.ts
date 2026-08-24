import type { Locale } from "@/i18n/routing";

/** Public values from Chatwoot → Settings → Inboxes → Website → Configuration. */
export const CHATWOOT_BASE_URL = (
  process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "https://app.chatwoot.com"
).replace(/\/$/, "");

export const CHATWOOT_WEBSITE_TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN || "";

export function chatwootLocale(locale: Locale): string {
  return locale === "zh-hans" ? "zh_CN" : locale;
}
