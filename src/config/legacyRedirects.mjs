const permanent = (source, destination) => ({
  // Browsers send non-ASCII path segments percent-encoded. Next.js matches
  // redirect sources against that encoded pathname, so normalize every source
  // here while keeping the declarations below readable and auditable.
  source: encodeURI(source),
  destination,
  permanent: true,
});

const pageRedirects = [
  // English aliases. Historical URLs remain canonical.
  permanent("/home", "/"),
  permanent("/home-2", "/"),
  permanent("/pamm-account", "/social-trading-platform"),
  permanent("/social-trading", "/social-trading-platform"),
  permanent("/payment-methods", "/money-transfer-methods"),
  permanent("/platforms/metatrader-5", "/metatrader-5"),

  // German aliases to canonical WPML slugs.
  permanent("/de/startseite", "/de"),
  permanent("/de/landing-3", "/de/promotions"),
  permanent("/de/social-trading", "/de/social-trading-platform"),
  permanent("/de/payment-methods", "/de/money-transfer-methods"),
  permanent("/de/partnership", "/de/partnerschaft"),
  permanent("/de/legal-documents", "/de/juristische-dokumente"),
  permanent("/de/calendar", "/de/wirtschaftskalender"),
  permanent("/de/platforms/metatrader-5", "/de/metatrader-5"),
  permanent("/de/contact", "/de/kontaktieren-sie-uns"),
  permanent("/de/accounts", "/de/roco-accounts"),
  permanent("/de/about", "/de/ueber-uns"),

  // Russian aliases to canonical WPML slugs.
  permanent("/ru/landing-3", "/ru/promotions"),
  permanent("/ru/social-trading", "/ru/social-trading-platform"),
  permanent("/ru/payment-methods", "/ru/money-transfer-methods"),
  permanent("/ru/calendar", "/ru/economic-calendar"),
  permanent("/ru/platforms/metatrader-5", "/ru/metatrader-5"),
  permanent("/ru/contact", "/ru/contact-us"),
  permanent("/ru/accounts", "/ru/roco-accounts"),
  permanent("/ru/about", "/ru/about-us"),

  // Arabic aliases to canonical WPML slugs.
  permanent("/ar/payment-methods", encodeURI("/ar/طرق-تحويل-الأموال")),
  permanent("/ar/faq", encodeURI("/ar/الأسئلة-الشائعة")),
  permanent("/ar/partnership", encodeURI("/ar/الشراكة")),
  permanent("/ar/legal-documents", encodeURI("/ar/المستندات-القانونية")),
  permanent("/ar/calendar", encodeURI("/ar/التقويم-الاقتصادي")),
  permanent("/ar/platforms/metatrader-5", encodeURI("/ar/ميتاتريدر-5")),
  permanent("/ar/promotions", encodeURI("/ar/العروض-الترويجية")),
  permanent("/ar/contact", encodeURI("/ar/اتصل-بنا")),
  permanent("/ar/accounts", encodeURI("/ar/حسابات-roco")),
  permanent("/ar/about", encodeURI("/ar/نبذة-عنا")),

  // Persian aliases and campaigns. The highest-value historical slug for each
  // real page is canonical; duplicate campaigns consolidate into it.
  permanent("/fa/مسابقه-روکو", encodeURI("/fa/تبلیغات")),
  permanent("/fa/pamm-accounts", "/fa/social-trade-platform"),
  permanent("/fa/social-trading", "/fa/social-trade-platform"),
  permanent("/fa/dubai-workshop", encodeURI("/fa/تبلیغات")),
  permanent("/fa/ictpro", encodeURI("/fa/تبلیغات")),
  permanent("/fa/ictgift", encodeURI("/fa/تبلیغات")),
  permanent("/fa/promotions", encodeURI("/fa/تبلیغات")),
  permanent("/fa/payment-methods", encodeURI("/fa/روش-های-انتقال-وجه")),
  permanent("/fa/راهنمای-گام-به-گام", encodeURI("/fa/حساب-های-roco")),
  permanent("/fa/accounts", encodeURI("/fa/حساب-های-roco")),
  permanent("/fa/faq", encodeURI("/fa/سوالات-متداول")),
  permanent("/fa/partnership", encodeURI("/fa/مشارکت")),
  permanent("/fa/legal-documents", encodeURI("/fa/اسناد-حقوقی")),
  permanent("/fa/calendar", encodeURI("/fa/تقویم")),
  permanent("/fa/platforms/metatrader-5", encodeURI("/fa/متاتریدر-5")),
  permanent("/fa/contact", encodeURI("/fa/تماس-بگیرید")),
  permanent("/fa/about", encodeURI("/fa/درباره-ما")),

  // Simplified Chinese aliases to canonical WPML slugs.
  permanent("/zh-hans/首页-2", "/zh-hans"),
  permanent("/zh-hans/payment-methods", encodeURI("/zh-hans/转账方式")),
  permanent("/zh-hans/faq", encodeURI("/zh-hans/常见问题")),
  permanent("/zh-hans/partnership", encodeURI("/zh-hans/合作伙伴")),
  permanent("/zh-hans/legal-documents", encodeURI("/zh-hans/法律文件")),
  permanent("/zh-hans/calendar", encodeURI("/zh-hans/经济日历")),
  permanent("/zh-hans/platforms/metatrader-5", "/zh-hans/metatrader-5"),
  permanent("/zh-hans/promotions", encodeURI("/zh-hans/促销活动")),
  permanent("/zh-hans/contact", encodeURI("/zh-hans/联系我们")),
  permanent("/zh-hans/accounts", encodeURI("/zh-hans/roco-账户")),
  permanent("/zh-hans/about", encodeURI("/zh-hans/关于我们")),
];

const marketSlugs = {
  en: {
    forex: "forex-trading",
    commodities: "commodities",
    metals: "metals",
    crypto: "crypto-currencies",
    stocks: "stocks",
    indices: "indices",
  },
  de: {
    forex: "forex-handel",
    commodities: "rohstoffe",
    metals: "metalle",
    crypto: "kryptowaehrungen",
    stocks: "aktien",
    indices: "indizes",
  },
  ru: {
    forex: "торговля-на-форекс",
    commodities: "товары",
    metals: "металлы",
    crypto: "криптовалюты",
    stocks: "акции",
    indices: "индексы",
  },
  ar: {
    forex: "تداول-الفوركس",
    commodities: "السلع-الأساسية",
    metals: "المعادن",
    crypto: "العملات-المشفرة",
    stocks: "الأسهم",
    indices: "المؤشرات",
  },
  fa: {
    forex: "تجارت-فارکس",
    commodities: "کالاها",
    metals: "فلزات",
    crypto: "ارزهای-رمزنگاری-شده",
    stocks: "سهام",
    indices: "شاخص-ها",
  },
  "zh-hans": {
    forex: "外汇交易",
    commodities: "商品",
    metals: "金属",
    crypto: "加密货币",
    stocks: "股票",
    indices: "指数",
  },
};

const marketRedirects = Object.entries(marketSlugs).flatMap(
  ([locale, slugs]) => {
    const prefix = locale === "en" ? "" : `/${locale}`;
    return [
      permanent(
        `${prefix}/services`,
        encodeURI(`${prefix}/services/${slugs.forex}`),
      ),
      ...Object.entries(slugs).map(([market, slug]) =>
        permanent(
          `${prefix}/markets/${market}`,
          encodeURI(`${prefix}/services/${slug}`),
        ),
      ),
    ];
  },
);

const englishBlogSlugs = [
  "spread",
  "technical-analysis",
  "economic-calendar",
  "swap",
  "fundamental-analysis",
  "leverage",
  "margin-call",
  "regulation",
];

const persianBlogSlugs = [
  "تعطیلی-بازار-فارکس",
  "تفاوت-فارکس-و-کریپتو",
  "حساب-دمو-فارکس",
  "لوریج-در-فارکس",
  "لیست-جفت-ارزهای-اصلی-فارکس",
  "بروکر-برای-کریپتوکارنسی",
  "بهترین-بروکر-برای-اسکالپ",
  "بهترین-بروکر-برای-حساب-دمو",
  "نماد-نزدک-در-فارکس",
  "پیپ-در-فارکس",
  "نماد-نقره-در-فارکس",
  "بروکر-با-حداقل-واریز",
  "وایت-لیبل-بروکر",
  "استاپ-اوت-در-بروکر-چیست",
  "بهترین-بروکر-طلای-آبشده",
  "بروکر-نفت-و-گاز-چیست",
  "بهترین-بروکر-بدون-احراز-هویت",
  "اتصال-بروکر-به-تریدینگ-ویو",
  "بهترین-بروکر-فارکس-در-کانادا",
  "بهترین-بروکر-فارکس-در-ترکیه",
  "انتخاب-بروکر-معتبر",
  "ساعت-باز-شدن-بازار-طلا-در-فارکس",
  "اسپرد-چیست",
  "نماد-نفت-در-فارکس",
  "نماد-طلا-در-فارکس",
  "سشن-های-فارکس",
  "نماد-داوجونز-در-فارکس",
  "بهترین-بروکر-های-جهان",
  "ساعت-باز-شدن-بازار-فارکس",
  "بروکر-با-اسپرد-صفر",
  "کدام-بروکر-حساب-سنتی-دارد",
  "بهترین-بروکر-برای-حساب-دمو-2",
  "بهترین-بروکر-باینری-آپشن",
  "فرق-بروکر-با-صرافی",
  "بهترین-بروکر-هایی-جهان",
  "بروکر-چیست",
  "بروکر-جدید-در-ایران",
  "بروکرهای-تحریم-نشده-برای-ایرانیها",
  "مقایسه-بروکرها-در-سال-۲۰۲۵",
  "بهترین-بروکر-برای-ترید-در-زمان-خبر",
  "بهترین-بروکر-برای-nfp",
  "بروکر-بدون-کمیسیون",
  "بروکر-برای-معاملات-طلا-و-نفت",
  "بروکر-برای-افراد-تازه-کار",
  "تقلب-بروکرها",
  "درآمد-بروکر",
  "آیا-بروکرهای-فارکس-قانونی-هستند",
  "بروکر-مناسب-برای-کپی-تریدینگ",
  "کدام-بروکرها-اسپرد-شناور-دارند",
  "فاوت-بروکر-مارکت-میکر-و-ecn",
  "بروکر-مناسب-برای-ترید-نفت",
  "بروکر-مناسب-برای-ترید-طلا",
  "بهترین-بروکر-برای-معامله-جفت-ارزها",
  "بروکر-رگوله-چیست",
  "بروکر-مناسب-برای-متاتریدر-۴-و-۵",
  "مقایسه-بروکرهای-فارکس-برای-معامله-طلا",
  "آموزش-ثبت-نام-در-بروکر-خارجی",
  "بروکر-ecn",
  "بهترین-بروکر-برای-ایرانیها",
  "تفاوت-صرافی-و-بروکر-در-بازار-فارکس",
  "بروکر-فارکس-چیست",
];

const blogRedirects = [
  permanent("/fa/blog", encodeURI("/fa/وبلاگ")),
  permanent("/zh-hans/blog", encodeURI("/zh-hans/博客")),
  ...englishBlogSlugs.map((slug) =>
    permanent(`/blog/${slug}`, `/${slug}`),
  ),
  ...persianBlogSlugs.map((slug) =>
    permanent(`/fa/blog/${slug}`, encodeURI(`/fa/${slug}`)),
  ),
];

export const legacyRewrites = [
  {
    source: "/wp-content/uploads/2025/07/social-trade-provider-agreement.pdf",
    destination: "/documents/social-trade-provider-agreement.pdf",
  },
];

/**
 * Explicit cutover redirects only. Personalized/authentication pages from the
 * old WordPress install are intentionally excluded and continue to return 404.
 */
export const legacyRedirects = [
  ...pageRedirects,
  ...marketRedirects,
  ...blogRedirects,
];

const legacyRedirectLookup = new Map(
  legacyRedirects.map(({ source, destination }) => [decodeURI(source), destination]),
);

/**
 * Resolve redirects against the browser's original, decoded pathname.
 *
 * These redirects must run before next-intl rewrites a public localized URL
 * to its internal route. Running them through next.config redirects makes an
 * internal route such as `/fa/promotions` indistinguishable from a direct
 * request for that alias and creates a self-redirect loop.
 */
export function resolveLegacyRedirect(pathname) {
  return legacyRedirectLookup.get(pathname);
}
