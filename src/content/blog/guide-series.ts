import type { GuideArticleContent } from "./guide-types";
import { guideArticles } from "./guides";

export type GuideSeriesArticle = {
  slug: string;
  title: string;
  description: string;
  /** Full native article content. */
  content: GuideArticleContent;
};

export type GuideSeries = {
  locale: "fa";
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  startLabel: string;
  articles: GuideSeriesArticle[];
};

/**
 * The legacy step-by-step guide series. The URLs (`/blog/series/<slug>` and
 * `/blog/series/<slug>/<article>`) are unchanged from the Canva/PDF era; only
 * the rendering is native now.
 */
const stepByStepGuide: GuideSeries = {
  locale: "fa",
  slug: "راهنمای-گام-به-گام",
  eyebrow: "مجموعه آموزشی",
  title: "راهنمای گام‌به‌گام روکو",
  description: "دوازده راهنمای مرحله‌به‌مرحله برای کار با حساب روکو؛ از ثبت‌نام و احراز هویت تا واریز، برداشت، انتقال دارایی، بونوس و سوشال ترید.",
  startLabel: "شروع مجموعه",
  articles: guideArticles.map((content) => ({
    slug: content.slug,
    title: content.title,
    description: content.description,
    content,
  })),
};

export const guideSeries = [stepByStepGuide] as const;

export function getGuideSeries(locale: string, slug: string): GuideSeries | undefined {
  return guideSeries.find((series) => series.locale === locale && series.slug === slug);
}

export function getGuideSeriesForLocale(locale: string): GuideSeries[] {
  return guideSeries.filter((series) => series.locale === locale);
}
