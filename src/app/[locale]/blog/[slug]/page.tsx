import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { OG_IMAGE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_URL, localizedUrl } from "@/lib/seo";
import { BlogArticleView, type BlogArticleUi } from "@/components/pages/BlogPage/BlogArticleView";
import { Footer } from "@/components/layout/Footer/Footer";
import { serializeJsonLd } from "@/lib/content/article-seo";
import { contentSource, getPublishedContentRepository } from "@/lib/content/content-source";
import { getPublishedArticleSeo } from "@/lib/content/published-seo";
import { findPublishedSlugRedirect } from "@/lib/content/database-routing";
import { publishedArticlePath } from "@/config/blog-routing";

export async function generateStaticParams() {
  return getPublishedContentRepository().listStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublishedContentRepository().findPost(locale, slug);
  if (!post) return {};
  if (contentSource() === "database") {
    const seo = await getPublishedArticleSeo(post.locale, post.slug);
    if (seo) return {
      title: seo.title,
      description: seo.description,
      robots: seo.robots,
      alternates: { canonical: seo.canonical, languages: seo.languages },
      openGraph: {
        type: "article", siteName: "ROCO Broker", title: seo.openGraph.title,
        description: seo.openGraph.description, url: seo.openGraph.url,
        publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [post.author],
        tags: post.tags.map((tag) => tag.name),
        images: seo.openGraph.image ? [seo.openGraph.image] : [],
      },
      twitter: {
        card: "summary_large_image", title: seo.twitter.title, description: seo.twitter.description,
        images: seo.twitter.image ? [seo.twitter.image] : [],
      },
    };
  }
  const path = `/blog/${post.slug}`;
  const canonicalLocale = post.locale;
  const canonical = localizedUrl(canonicalLocale, path);
  const languageCode = post.locale === "fa" ? "fa" : "en";
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical, languages: { [languageCode]: canonical, ...(post.locale === "en" ? { "x-default": canonical } : {}) } },
    openGraph: {
      type: "article",
      siteName: "ROCO Broker",
      title: post.title,
      description: post.excerpt,
      url: canonical,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags.map((tag) => tag.name),
      images: [{ url: OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: post.title }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: [OG_IMAGE] },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  const repository = getPublishedContentRepository();
  const post = await repository.findPost(locale, slug);
  if (!post) {
    if (contentSource() === "database") {
      const redirect = await findPublishedSlugRedirect(locale, decodeURIComponent(slug));
      if (redirect) permanentRedirect(redirect);
    }
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blogPage" });
  const ui: BlogArticleUi = {
    backToBlog: t("backToBlog"), minuteRead: t("minuteRead"), published: t("published"), updated: t("updated"),
    by: t("by"), contents: t("contents"), related: t("related"), recent: t("recent"), readArticle: t("readArticle"),
    fallbackNotice: t("fallbackNotice"), educationalNotice: t("educationalNotice"), share: t("share"),
    copyLink: t("copyLink"), copied: t("copied"),
  };
  const summaries = await repository.listPosts(locale);
  const recent = summaries.filter((item) => item.slug !== post.slug).slice(0, 4);
  const url = `${SITE_URL}${publishedArticlePath(post.locale, post.slug)}`;
  const databaseSeo = contentSource() === "database" ? await getPublishedArticleSeo(post.locale, post.slug) : null;
  const articleLd = databaseSeo?.blogPosting ?? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: post.locale,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "ROCO Broker", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/RokoLogo.svg` } },
    image: `${SITE_URL}${OG_IMAGE}`,
  };
  const breadcrumbLd = databaseSeo?.breadcrumbs ?? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ROCO Broker", item: localizedUrl(locale, "/") },
      { "@type": "ListItem", position: 2, name: t("title"), item: localizedUrl(locale, "/blog") },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      <BlogArticleView post={post} related={await repository.listRelatedPosts(post)} recent={recent} locale={locale} ui={ui} />
      <Footer />
    </main>
  );
}
