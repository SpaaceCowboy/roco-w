import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer/Footer";
import styles from "@/components/pages/BlogPage/GuideSeries.module.css";
import { GuideArticleView } from "@/components/pages/BlogPage/GuideArticleView";
import { getGuideSeries, guideSeries } from "@/content/blog/guide-series";
import { guideSeriesHref, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { serializeJsonLd } from "@/lib/content/article-seo";
import { buildMetadata, localizedUrl } from "@/lib/seo";

export function generateStaticParams() {
  return guideSeries.flatMap((series) => series.articles.map((article) => ({
    locale: series.locale,
    series: series.slug,
    article: article.slug,
  })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; series: string; article: string }> }): Promise<Metadata> {
  const { locale, series: seriesSlug, article: articleSlug } = await params;
  const series = getGuideSeries(locale, decodeURIComponent(seriesSlug));
  const article = series?.articles.find((item) => item.slug === decodeURIComponent(articleSlug));
  if (!series || !article) return {};
  return buildMetadata({
    locale,
    path: `/blog/series/${series.slug}/${article.slug}`,
    title: `${article.title} | ${series.title}`,
    description: article.description,
  });
}

export default async function GuideArticlePage({ params }: { params: Promise<{ locale: string; series: string; article: string }> }) {
  const { locale, series: seriesSlug, article: articleSlug } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  const series = getGuideSeries(locale, decodeURIComponent(seriesSlug));
  const articleIndex = series?.articles.findIndex((item) => item.slug === decodeURIComponent(articleSlug)) ?? -1;
  if (!series || articleIndex < 0) notFound();
  const article = series.articles[articleIndex];
  const content = article.content;
  setRequestLocale(locale);

  const total = series.articles.length;
  const position = articleIndex + 1;
  const progress = (position / total) * 100;
  const url = localizedUrl(locale, `/blog/series/${series.slug}/${article.slug}`);
  const seriesUrl = localizedUrl(locale, `/blog/series/${series.slug}`);
  const formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" });
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: content.pageTitle ?? article.title,
    description: article.description,
    url,
    inLanguage: locale,
    dateModified: content.updatedAt,
    keywords: content.topics?.join(", "),
    isPartOf: { "@type": "CreativeWorkSeries", name: series.title, url: seriesUrl },
    publisher: { "@type": "Organization", name: "ROCO Broker", url: localizedUrl(locale, "/") },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "وبلاگ", item: localizedUrl(locale, "/blog") },
      { "@type": "ListItem", position: 2, name: series.title, item: seriesUrl },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };

  return (
    <main id="main-content" className={styles.page} dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      <header className={`${styles.hero} ${styles.heroArticle}`}>
        <div className={styles.inner}>
          <Link href={guideSeriesHref(series.slug)} className={styles.back}><span aria-hidden="true">→</span> {series.title}</Link>
          <span className={styles.eyebrow}>{series.eyebrow}</span>
          <h1>{content.pageTitle ?? article.title}</h1>
          <p>{content.lead}</p>
          <div className={styles.heroMeta}>
            <span>راهنمای {position.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span>
            <span>{content.readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه</span>
            <span>آخرین بازبینی: <time dateTime={content.updatedAt}>{formatter.format(new Date(content.updatedAt))}</time></span>
          </div>
          <div className={styles.heroProgress}>
            <div className={styles.heroProgressLabel}>
              <span>پیشرفت مجموعه</span>
              <strong>{position.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</strong>
            </div>
            <div className={styles.heroProgressTrack}>
              <span className={styles.heroProgressBar} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <GuideArticleView
        article={content}
        series={series.articles.map((item) => ({ slug: item.slug, title: item.title, description: item.description }))}
        seriesSlug={series.slug}
        seriesTitle={series.title}
        seriesEyebrow={series.eyebrow}
        index={articleIndex}
      />
      <Footer />
    </main>
  );
}
