const permanent = (source, destination) => ({
  // Browsers send non-ASCII path segments percent-encoded. Next.js matches
  // redirect sources against that encoded pathname, so normalize every source
  // here while keeping the declarations below readable and auditable.
  source: encodeURI(source),
  destination,
  permanent: true,
});

const pageRedirects = [
  // English pages whose information architecture changed.
  permanent("/home", "/"),
  permanent("/home-2", "/"),
  permanent("/pamm-account", "/social-trading"),
  permanent("/social-trading-platform", "/social-trading"),
  permanent("/money-transfer-methods", "/payment-methods"),
  permanent("/metatrader-5", "/platforms/metatrader-5"),

  // German WPML slugs.
  permanent("/de/startseite", "/de"),
  permanent("/de/landing-3", "/de/promotions"),
  permanent("/de/social-trading-platform", "/de/social-trading"),
  permanent("/de/money-transfer-methods", "/de/payment-methods"),
  permanent("/de/partnerschaft", "/de/partnership"),
  permanent("/de/juristische-dokumente", "/de/legal-documents"),
  permanent("/de/wirtschaftskalender", "/de/calendar"),
  permanent("/de/metatrader-5", "/de/platforms/metatrader-5"),
  permanent("/de/kontaktieren-sie-uns", "/de/contact"),
  permanent("/de/roco-accounts", "/de/accounts"),
  permanent("/de/ueber-uns", "/de/about"),

  // Russian WPML slugs.
  permanent("/ru/landing-3", "/ru/promotions"),
  permanent("/ru/social-trading-platform", "/ru/social-trading"),
  permanent("/ru/money-transfer-methods", "/ru/payment-methods"),
  permanent("/ru/economic-calendar", "/ru/calendar"),
  permanent("/ru/metatrader-5", "/ru/platforms/metatrader-5"),
  permanent("/ru/contact-us", "/ru/contact"),
  permanent("/ru/roco-accounts", "/ru/accounts"),
  permanent("/ru/about-us", "/ru/about"),

  // Arabic WPML slugs.
  permanent("/ar/طرق-تحويل-الأموال", "/ar/payment-methods"),
  permanent("/ar/الأسئلة-الشائعة", "/ar/faq"),
  permanent("/ar/الشراكة", "/ar/partnership"),
  permanent("/ar/المستندات-القانونية", "/ar/legal-documents"),
  permanent("/ar/التقويم-الاقتصادي", "/ar/calendar"),
  permanent("/ar/ميتاتريدر-5", "/ar/platforms/metatrader-5"),
  permanent("/ar/العروض-الترويجية", "/ar/promotions"),
  permanent("/ar/اتصل-بنا", "/ar/contact"),
  permanent("/ar/حسابات-roco", "/ar/accounts"),
  permanent("/ar/نبذة-عنا", "/ar/about"),

  // Persian WPML slugs and campaign pages.
  permanent("/fa/مسابقه-روکو", "/fa/promotions"),
  permanent("/fa/pamm-accounts", "/fa/social-trading"),
  permanent("/fa/social-trade-platform", "/fa/social-trading"),
  permanent("/fa/dubai-workshop", "/fa/promotions"),
  permanent("/fa/ictpro", "/fa/promotions"),
  permanent("/fa/ictgift", "/fa/promotions"),
  permanent("/fa/روش-های-انتقال-وجه", "/fa/payment-methods"),
  permanent("/fa/راهنمای-گام-به-گام", "/fa/accounts"),
  permanent("/fa/سوالات-متداول", "/fa/faq"),
  permanent("/fa/مشارکت", "/fa/partnership"),
  permanent("/fa/اسناد-حقوقی", "/fa/legal-documents"),
  permanent("/fa/تقویم", "/fa/calendar"),
  permanent("/fa/متاتریدر-5", "/fa/platforms/metatrader-5"),
  permanent("/fa/تبلیغات", "/fa/promotions"),
  permanent("/fa/تماس-بگیرید", "/fa/contact"),
  permanent("/fa/حساب-های-roco", "/fa/accounts"),
  permanent("/fa/درباره-ما", "/fa/about"),

  // Simplified Chinese WPML slugs.
  permanent("/zh-hans/首页-2", "/zh-hans"),
  permanent("/zh-hans/转账方式", "/zh-hans/payment-methods"),
  permanent("/zh-hans/常见问题", "/zh-hans/faq"),
  permanent("/zh-hans/合作伙伴", "/zh-hans/partnership"),
  permanent("/zh-hans/法律文件", "/zh-hans/legal-documents"),
  permanent("/zh-hans/经济日历", "/zh-hans/calendar"),
  permanent("/zh-hans/metatrader-5", "/zh-hans/platforms/metatrader-5"),
  permanent("/zh-hans/促销活动", "/zh-hans/promotions"),
  permanent("/zh-hans/联系我们", "/zh-hans/contact"),
  permanent("/zh-hans/roco-账户", "/zh-hans/accounts"),
  permanent("/zh-hans/关于我们", "/zh-hans/about"),
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
      permanent(`${prefix}/services`, `${prefix}/markets/forex`),
      ...Object.entries(slugs).map(([market, slug]) =>
        permanent(`${prefix}/services/${slug}`, `${prefix}/markets/${market}`),
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
  permanent("/fa/وبلاگ", "/fa/blog"),
  permanent("/zh-hans/博客", "/zh-hans/blog"),
  ...englishBlogSlugs.map((slug) =>
    permanent(`/${slug}`, `/blog/${slug}`),
  ),
  ...persianBlogSlugs.map((slug) =>
    permanent(`/fa/${slug}`, encodeURI(`/fa/blog/${slug}`)),
  ),
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
