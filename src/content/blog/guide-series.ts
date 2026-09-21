import type { GuideArticleContent, GuideLocale } from "./guide-types";
import { enGuideArticles, faGuideArticles } from "./guides";

export type GuideSeriesArticle = {
  slug: string;
  title: string;
  description: string;
  /** Full native article content. */
  content: GuideArticleContent;
};

export type GuideSeries = {
  locale: GuideLocale;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  startLabel: string;
  /** Landing-page call to action text. */
  ctaTitle: string;
  ctaBody: string;
  articles: GuideSeriesArticle[];
};

function toArticles(articles: GuideArticleContent[]): GuideSeriesArticle[] {
  return articles.map((content) => ({
    slug: content.slug,
    title: content.title,
    description: content.description,
    content,
  }));
}

/**
 * The step-by-step guide series. The Persian series keeps the URLs from the
 * Canva/PDF era (`/fa/وبلاگ/مجموعه/راهنمای-گام-به-گام/...`); the English series
 * is served under `/blog/series/step-by-step-guide/...`.
 */
const persianGuide: GuideSeries = {
  locale: "fa",
  slug: "راهنمای-گام-به-گام",
  eyebrow: "مجموعه آموزشی",
  title: "راهنمای گام‌به‌گام روکو",
  description: "دوازده راهنمای مرحله‌به‌مرحله برای کار با حساب روکو؛ از ثبت‌نام و احراز هویت تا واریز، برداشت، انتقال دارایی، بونوس و سوشال ترید.",
  startLabel: "شروع مجموعه",
  ctaTitle: "از کجا شروع کنیم؟",
  ctaBody: "اگر تازه با روکو آشنا شده‌اید، از راهنمای «ثبت‌نام در روکو» شروع کنید. راهنماها به‌ترتیب مراحل آماده شده‌اند و در هر صفحه می‌توانید به راهنمای قبلی یا بعدی بروید.",
  articles: toArticles(faGuideArticles),
};

const englishGuide: GuideSeries = {
  locale: "en",
  slug: "step-by-step-guide",
  eyebrow: "Guide series",
  title: "ROCO Step-by-Step Guide",
  description: "Twelve step-by-step guides for working with your ROCO account, from registration and identity verification to deposits, withdrawals, internal transfers, bonuses and social trading.",
  startLabel: "Start the series",
  ctaTitle: "Where should I start?",
  ctaBody: "If you are new to ROCO, start with the Registration guide. The guides follow the real sequence for setting up and funding an account, and every page links to the previous and next step.",
  articles: toArticles(enGuideArticles),
};

export const guideSeries = [persianGuide, englishGuide] as const;

export function getGuideSeries(locale: string, slug: string): GuideSeries | undefined {
  return guideSeries.find((series) => series.locale === locale && series.slug === slug);
}

export function getGuideSeriesForLocale(locale: string): GuideSeries[] {
  return guideSeries.filter((series) => series.locale === locale);
}
