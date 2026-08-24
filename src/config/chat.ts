import type { Locale } from "@/i18n/routing";

export type LiveChatProvider = "chatwoot" | "crisp";

/**
 * Chatwoot stays the default. Set this to `crisp` only in the environment where
 * the Crisp trial should run, so both vendors are never loaded together.
 */
export const LIVE_CHAT_PROVIDER: LiveChatProvider =
  process.env.NEXT_PUBLIC_LIVE_CHAT_PROVIDER?.toLowerCase() === "crisp"
    ? "crisp"
    : "chatwoot";

/** Public values from Chatwoot → Settings → Inboxes → Website → Configuration. */
export const CHATWOOT_BASE_URL = (
  process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "https://app.chatwoot.com"
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
