export const contentLocales = ["en", "fa", "de", "ru", "ar", "zh-hans"] as const;
export type ContentLocale = (typeof contentLocales)[number];
export const rtlContentLocales = new Set<ContentLocale>(["fa", "ar"]);
