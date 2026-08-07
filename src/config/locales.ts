import type { Locale } from "@/i18n/routing";

/**
 * Display metadata for each locale:
 *  - `native`: the language name in its own language (shown in the switcher list)
 *  - `short`:  compact label for the switcher toggle (e.g. "EN")
 */
export const LOCALE_META: Record<Locale, { native: string; short: string }> = {
  en: { native: "English", short: "EN" },
  de: { native: "Deutsch", short: "DE" },
  ru: { native: "Русский", short: "RU" },
  ar: { native: "العربية", short: "AR" },
  fa: { native: "فارسی", short: "FA" },
  "zh-hans": { native: "简体中文", short: "中文" },
};
