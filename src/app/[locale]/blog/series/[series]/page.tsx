import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer/Footer";
import styles from "@/components/pages/BlogPage/GuideSeries.module.css";
import { getGuideSeries, guideSeries } from "@/content/blog/guide-series";
import { guideArticleHref, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
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

  const url = localizedUrl(locale, `/blog/series/${series.slug}`);
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
    <main id="main-content" className={styles.page} dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionLd) }} />
      <header className={styles.hero}>
        <div className={styles.inner}>
          <Link href="/blog" className={styles.back}><span aria-hidden="true">→</span> بازگشت به وبلاگ</Link>
          <span className={styles.eyebrow}>{series.eyebrow}</span>
          <h1>{series.title}</h1>
          <p>{series.description}</p>
          <div className={styles.seriesMeta}><span>{series.articles.length.toLocaleString("fa-IR")}</span><span>راهنمای کاربردی</span></div>
        </div>
      </header>
      <div className={styles.inner}>
        <ol className={styles.list}>
          {series.articles.map((article) => (
            <li key={article.slug} className={styles.item}>
              <Link href={guideArticleHref(series.slug, article.slug)}>
                <span className={styles.number} aria-hidden="true" />
                <div><h2>{article.title}</h2><p>{article.description}</p></div>
                <span className={styles.arrow} aria-hidden="true">←</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <Footer />
    </main>
  );
}
