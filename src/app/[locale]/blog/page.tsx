import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata, localizedUrl } from "@/lib/seo";
import { getPublishedContentRepository } from "@/lib/content/content-source";
import { serializeJsonLd } from "@/lib/content/article-seo";
import { getGuideSeriesForLocale } from "@/content/blog/guide-series";
import { BlogView, type BlogUi } from "@/components/pages/BlogPage/BlogView";
import { Footer } from "@/components/layout/Footer/Footer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blogPage" });
  return {
    ...buildMetadata({ locale, path: "/blog", title: t("title"), description: t("metaDescription") }),
    alternates: {
      ...buildMetadata({ locale, path: "/blog", title: t("title"), description: t("metaDescription") }).alternates,
      types: { "application/rss+xml": localizedUrl(locale, "/blog/feed.xml") },
    },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blogPage" });
  const repository = getPublishedContentRepository();
  const series = getGuideSeriesForLocale(locale);
  const [posts, categories, tags, hasNativeContent] = await Promise.all([
    repository.listPosts(locale), repository.listCategories(locale), repository.listTags(locale),
    repository.hasNativeContent(locale),
  ]);
  const ui: BlogUi = {
    eyebrow: t("eyebrow"), title: t("title"), lead: t("lead"), searchLabel: t("searchLabel"),
    searchPlaceholder: t("searchPlaceholder"), allCategories: t("allCategories"), featured: t("featured"),
    latest: t("latest"), readArticle: t("readArticle"), minuteRead: t("minuteRead"), results: t("results"),
    noResults: t("noResults"), noResultsHint: t("noResultsHint"), clearFilters: t("clearFilters"),
    previous: t("previous"), next: t("next"), page: t("page"), tagsLabel: t("tagsLabel"),
    fallbackNotice: t("fallbackNotice"),
  };
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: t("title"),
    description: t("metaDescription"),
    url: localizedUrl(locale, "/blog"),
    publisher: { "@type": "Organization", name: "ROCO Broker", url: localizedUrl(locale, "/") },
    blogPost: posts.slice(0, 10).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      datePublished: post.publishedAt,
      url: localizedUrl(locale, `/blog/${post.slug}`),
    })),
    hasPart: series.map((item) => ({
      "@type": "CollectionPage",
      name: item.title,
      description: item.description,
      url: localizedUrl(locale, `/blog/series/${item.slug}`),
    })),
  };

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogLd) }} />
      <Suspense fallback={null}>
        <BlogView
          posts={posts}
          categories={categories}
          tags={tags}
          locale={locale}
          hasNativeContent={hasNativeContent}
          ui={ui}
          series={series}
        />
      </Suspense>
      <Footer />
    </main>
  );
}
