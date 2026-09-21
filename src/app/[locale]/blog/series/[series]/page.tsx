import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer/Footer";
import styles from "@/components/pages/BlogPage/GuideSeries.module.css";
import { getGuideSeries, guideSeries } from "@/content/blog/guide-series";
import { getGuideUi } from "@/content/blog/guide-ui";
import type { GuideLocale } from "@/content/blog/guide-types";
import { guideArticleHref, Link } from "@/i18n/navigation";
import { isRtl, routing } from "@/i18n/routing";
import { serializeJsonLd } from "@/lib/content/article-seo";
import { buildMetadata, localizedUrl } from "@/lib/seo";

export function generateStaticParams() {
  return guideSeries.map((series) => ({ locale: series.locale, series: series.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; series: string }> }): Promise<Metadata> {
  const { locale, series: slug } = await params;
  const series = getGuideSeries(locale, decodeURIComponent(slug));
  if (!series) return {};
  return buildMetadata({ locale, path: `/blog/series/${series.slug}`, title: series.title, description: series.description });
}

export default async function GuideSeriesPage({ params }: { params: Promise<{ locale: string; series: string }> }) {
  const { locale, series: slug } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  const series = getGuideSeries(locale, decodeURIComponent(slug));
  if (!series) notFound();
  setRequestLocale(locale);

  const guideLocale = series.locale as GuideLocale;
  const ui = getGuideUi(guideLocale);
  const num = (value: number) => value.toLocaleString(guideLocale === "fa" ? "fa-IR" : "en");
  const url = localizedUrl(locale, `/blog/series/${series.slug}`);
  const totalMinutes = series.articles.reduce((total, article) => total + article.content.readingMinutes, 0);
  const latestUpdate = series.articles
    .map((article) => article.content.updatedAt)
    .sort()
    .at(-1);
  const updateLabel = latestUpdate
    ? new Intl.DateTimeFormat(locale, { year: "numeric" }).format(new Date(latestUpdate))
    : "";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: series.title,
    description: series.description,
    url,
    inLanguage: locale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: series.articles.length,
      itemListElement: series.articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: localizedUrl(locale, `/blog/series/${series.slug}/${article.slug}`),
      })),
    },
  };

  return (
    <main id="main-content" className={styles.page} dir={isRtl(guideLocale) ? "rtl" : "ltr"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionLd) }} />
      <header className={styles.hero}>
        <div className={styles.inner}>
          <Link href="/blog" className={styles.back}><span aria-hidden="true">{ui.backArrow}</span> {ui.backToBlog}</Link>
          <span className={styles.eyebrow}>{series.eyebrow}</span>
          <h1>{series.title}</h1>
          <p>{series.description}</p>
          <div className={styles.heroMeta}>
            <span>{ui.guidesCount(num(series.articles.length))}</span>
            <span>{ui.totalReading(num(totalMinutes))}</span>
            {updateLabel && <span>{ui.lastReviewed} {updateLabel}</span>}
          </div>
        </div>
      </header>

      <div className={styles.inner}>
        <nav aria-label={ui.seriesIndexAria(series.title)}>
          <ol className={styles.list}>
            {series.articles.map((article, index) => (
              <li key={article.slug} className={styles.item}>
                <Link href={guideArticleHref(series.slug, article.slug)}>
                  <span className={styles.number} aria-hidden="true" />
                  <div className={styles.itemBody}>
                    <h2>{article.title}</h2>
                    <p>{article.description}</p>
                    <div className={styles.itemMeta}>
                      <span>{ui.guideWord} {num(index + 1)}</span>
                      <span>{num(article.content.readingMinutes)} {ui.minuteShort}</span>
                      {article.content.topics?.slice(0, 2).map((topic) => <span key={topic}>{topic}</span>)}
                    </div>
                  </div>
                  <span className={styles.arrow} aria-hidden="true">{ui.arrow}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.landingFooter}>
          <div>
            <strong>{series.ctaTitle}</strong>
            <p>{series.ctaBody}</p>
          </div>
          <Link href={guideArticleHref(series.slug, series.articles[0].slug)} className={styles.startButton}>{series.startLabel}</Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
