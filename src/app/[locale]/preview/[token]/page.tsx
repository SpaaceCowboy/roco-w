import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogArticleView, type BlogArticleUi } from "@/components/pages/BlogPage/BlogArticleView";
import { Footer } from "@/components/layout/Footer/Footer";
import type { BlogPost } from "@/lib/blog";
import { getPreviewLocalization } from "@/lib/admin/content-service";
import { verifyPreviewToken } from "@/lib/admin/preview-token";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Draft preview", robots: { index: false, follow: false, nocache: true } };

export default async function DraftPreviewPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const payload = verifyPreviewToken(token);
  if (!payload || payload.locale !== locale) notFound();
  const item = await getPreviewLocalization(payload.localizationId).catch(() => null);
  if (!item || item.locale !== locale) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blogPage" });
  const ui: BlogArticleUi = {
    backToBlog: t("backToBlog"), minuteRead: t("minuteRead"), published: t("published"), updated: t("updated"),
    by: t("by"), contents: t("contents"), related: t("related"), recent: t("recent"), readArticle: t("readArticle"),
    fallbackNotice: t("fallbackNotice"), educationalNotice: t("educationalNotice"), share: t("share"),
    copyLink: t("copyLink"), copied: t("copied"),
  };
  const now = item.updatedAt.toISOString();
  const post: BlogPost = {
    sourceId: 0,
    locale: item.locale,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    category: { slug: "draft", name: "Draft preview" },
    tags: [],
    publishedAt: item.publishedAt?.toISOString() ?? now,
    updatedAt: now,
    author: item.authorName,
    readingMinutes: item.readingMinutes,
    featuredImage: "",
    featuredImageAlt: item.featuredImageAlt,
    featuredImageWidth: 1600,
    featuredImageHeight: 900,
    contentHtml: item.renderedHtml,
    tableOfContents: [],
  };

  return <main id="main-content"><BlogArticleView post={post} related={[]} recent={[]} locale={locale} ui={ui} /><Footer /></main>;
}
