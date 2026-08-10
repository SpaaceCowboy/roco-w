import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata, localizedUrl } from "@/lib/seo";
import { getBlogCategories, getBlogPostSummaries, getBlogTags, hasNativeBlogContent } from "@/lib/blog";
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
  const posts = getBlogPostSummaries(locale);
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
  };

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }} />
      <Suspense fallback={null}>
        <BlogView
          posts={posts}
          categories={getBlogCategories(locale)}
          tags={getBlogTags(locale)}
          locale={locale}
          hasNativeContent={hasNativeBlogContent(locale)}
          ui={ui}
        />
      </Suspense>
      <Footer />
    </main>
  );
}
