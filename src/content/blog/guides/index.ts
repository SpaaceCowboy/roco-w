import type { GuideArticleContent, GuideLocale } from "../guide-types";
import { faGuideArticles } from "./fa";
import { enGuideArticles } from "./en";

export { faGuideArticles, enGuideArticles };

/** Guide articles per locale, in series reading order. */
export const guideArticlesByLocale: Record<GuideLocale, GuideArticleContent[]> = {
  fa: faGuideArticles,
  en: enGuideArticles,
};

export function getGuideArticle(locale: GuideLocale, slug: string): GuideArticleContent | undefined {
  return guideArticlesByLocale[locale].find((article) => article.slug === slug);
}
