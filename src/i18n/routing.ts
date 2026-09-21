import { defineRouting } from "next-intl/routing";

/**
 * Central i18n configuration.
 *
 * Internal routes stay language-neutral while `pathnames` preserves the
 * public URLs used by the previous WordPress/WPML site. This lets the app keep
 * one implementation per page without changing established canonical URLs.
 */
export const routing = defineRouting({
  locales: ["en", "de", "ru", "ar", "fa", "zh-hans"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/accounts": {
      en: "/accounts",
      de: "/roco-accounts",
      ru: "/roco-accounts",
      ar: "/حسابات-roco",
      fa: "/حساب-های-roco",
      "zh-hans": "/roco-账户",
    },
    "/swap-free-account": "/swap-free-account",
    "/social-trading": {
      en: "/social-trading-platform",
      de: "/social-trading-platform",
      ru: "/social-trading-platform",
      ar: "/social-trading",
      fa: "/social-trade-platform",
      "zh-hans": "/social-trading",
    },
    "/payment-methods": {
      en: "/money-transfer-methods",
      de: "/money-transfer-methods",
      ru: "/money-transfer-methods",
      ar: "/طرق-تحويل-الأموال",
      fa: "/روش-های-انتقال-وجه",
      "zh-hans": "/转账方式",
    },
    "/calendar": {
      en: "/calendar",
      de: "/wirtschaftskalender",
      ru: "/economic-calendar",
      ar: "/التقويم-الاقتصادي",
      fa: "/تقویم",
      "zh-hans": "/经济日历",
    },
    "/tools/forex-calculator": "/tools/forex-calculator",
    "/platforms/metatrader-5": {
      en: "/metatrader-5",
      de: "/metatrader-5",
      ru: "/metatrader-5",
      ar: "/ميتاتريدر-5",
      fa: "/متاتریدر-5",
      "zh-hans": "/metatrader-5",
    },
    "/promotions": {
      en: "/promotions",
      de: "/promotions",
      ru: "/promotions",
      ar: "/العروض-الترويجية",
      fa: "/تبلیغات",
      "zh-hans": "/促销活动",
    },
    "/about": {
      en: "/about",
      de: "/ueber-uns",
      ru: "/about-us",
      ar: "/نبذة-عنا",
      fa: "/درباره-ما",
      "zh-hans": "/关于我们",
    },
    "/partnership": {
      en: "/partnership",
      de: "/partnerschaft",
      ru: "/partnership",
      ar: "/الشراكة",
      fa: "/مشارکت",
      "zh-hans": "/合作伙伴",
    },
    "/faq": {
      en: "/faq",
      de: "/faq",
      ru: "/faq",
      ar: "/الأسئلة-الشائعة",
      fa: "/سوالات-متداول",
      "zh-hans": "/常见问题",
    },
    "/contact": {
      en: "/contact",
      de: "/kontaktieren-sie-uns",
      ru: "/contact-us",
      ar: "/اتصل-بنا",
      fa: "/تماس-بگیرید",
      "zh-hans": "/联系我们",
    },
    "/legal-documents": {
      en: "/legal-documents",
      de: "/juristische-dokumente",
      ru: "/legal-documents",
      ar: "/المستندات-القانونية",
      fa: "/اسناد-حقوقی",
      "zh-hans": "/法律文件",
    },
    "/blog": {
      en: "/blog",
      de: "/blog",
      ru: "/blog",
      ar: "/blog",
      fa: "/وبلاگ",
      "zh-hans": "/博客",
    },
    "/blog/feed.xml": {
      en: "/blog/feed.xml",
      de: "/blog/feed.xml",
      ru: "/blog/feed.xml",
      ar: "/blog/feed.xml",
      fa: "/وبلاگ/feed.xml",
      "zh-hans": "/博客/feed.xml",
    },
    "/blog/[slug]": {
      en: "/[slug]",
      de: "/blog/[slug]",
      ru: "/blog/[slug]",
      ar: "/blog/[slug]",
      fa: "/[slug]",
      "zh-hans": "/blog/[slug]",
    },
    "/blog/series/[series]": {
      en: "/blog/series/[series]",
      de: "/blog/series/[series]",
      ru: "/blog/series/[series]",
      ar: "/blog/series/[series]",
      fa: "/وبلاگ/مجموعه/[series]",
      "zh-hans": "/博客/series/[series]",
    },
    "/blog/series/[series]/[article]": {
      en: "/blog/series/[series]/[article]",
      de: "/blog/series/[series]/[article]",
      ru: "/blog/series/[series]/[article]",
      ar: "/blog/series/[series]/[article]",
      fa: "/وبلاگ/مجموعه/[series]/[article]",
      "zh-hans": "/博客/series/[series]/[article]",
    },
    "/markets/forex": {
      en: "/services/forex-trading",
      de: "/services/forex-handel",
      ru: "/services/торговля-на-форекс",
      ar: "/services/تداول-الفوركس",
      fa: "/services/تجارت-فارکس",
      "zh-hans": "/services/外汇交易",
    },
    "/markets/commodities": {
      en: "/services/commodities",
      de: "/services/rohstoffe",
      ru: "/services/товары",
      ar: "/services/السلع-الأساسية",
      fa: "/services/کالاها",
      "zh-hans": "/services/商品",
    },
    "/markets/metals": {
      en: "/services/metals",
      de: "/services/metalle",
      ru: "/services/металлы",
      ar: "/services/المعادن",
      fa: "/services/فلزات",
      "zh-hans": "/services/金属",
    },
    "/markets/crypto": {
      en: "/services/crypto-currencies",
      de: "/services/kryptowaehrungen",
      ru: "/services/криптовалюты",
      ar: "/services/العملات-المشفرة",
      fa: "/services/ارزهای-رمزنگاری-شده",
      "zh-hans": "/services/加密货币",
    },
    "/markets/stocks": {
      en: "/services/stocks",
      de: "/services/aktien",
      ru: "/services/акции",
      ar: "/services/الأسهم",
      fa: "/services/سهام",
      "zh-hans": "/services/股票",
    },
    "/markets/indices": {
      en: "/services/indices",
      de: "/services/indizes",
      ru: "/services/индексы",
      ar: "/services/المؤشرات",
      fa: "/services/شاخص-ها",
      "zh-hans": "/services/指数",
    },
  },
});

export type Locale = (typeof routing.locales)[number];

/** Locales that render right-to-left. */
export const rtlLocales: readonly string[] = ["ar", "fa"];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale);
}
