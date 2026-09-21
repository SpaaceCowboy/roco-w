import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer/Footer";
import styles from "@/components/pages/BlogPage/GuideSeries.module.css";
import { GuideEmbed } from "@/components/pages/BlogPage/GuideEmbed";
import { getGuideSeries, guideSeries } from "@/content/blog/guide-series";
import { guideArticleHref, guideSeriesHref, Link } from "@/i18n/navigation";
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
  const previous = series.articles[articleIndex - 1];
  const next = series.articles[articleIndex + 1];
  setRequestLocale(locale);

  const url = localizedUrl(locale, `/blog/series/${series.slug}/${article.slug}`);
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description: article.description,
    url,
    inLanguage: locale,
    isPartOf: { "@type": "CreativeWorkSeries", name: series.title, url: localizedUrl(locale, `/blog/series/${series.slug}`) },
    publisher: { "@type": "Organization", name: "ROCO Broker", url: localizedUrl(locale, "/") },
  };

  return (
    <main id="main-content" className={styles.page} dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }} />
      <header className={`${styles.hero} ${styles.articleHero}`}>
        <div className={styles.inner}>
          <Link href={guideSeriesHref(series.slug)} className={styles.back}><span aria-hidden="true">→</span> بازگشت به مجموعه</Link>
          <span className={styles.articleIndex}>راهنمای {(articleIndex + 1).toLocaleString("fa-IR")} از {series.articles.length.toLocaleString("fa-IR")}</span>
          <h1>{article.title}</h1>
          <p>{article.description}</p>
        </div>
      </header>
      <article className={`${styles.inner} ${styles.articleBody}`}>
        <div className={styles.viewer}>
          <GuideEmbed src={article.embedUrl} title={`راهنمای تصویری ${article.title}`} />
        </div>
        <div className={styles.actions}>
          <a className={styles.download} href={article.downloadUrl} target="_blank" rel="noreferrer">{series.downloadLabel}</a>
          <p className={styles.sourceNote}>فایل راهنما در پنجره‌ای جدید باز می‌شود.</p>
        </div>
        {(previous || next) && (
          <nav className={styles.sequence} aria-label="راهنماهای این مجموعه">
            {previous ? <Link href={guideArticleHref(series.slug, previous.slug)}><span>راهنمای قبلی</span><strong>{previous.title}</strong></Link> : <span />}
            {next ? <Link href={guideArticleHref(series.slug, next.slug)}><span>راهنمای بعدی</span><strong>{next.title}</strong></Link> : <span />}
          </nav>
        )}
      </article>
      <Footer />
    </main>
  );
}
