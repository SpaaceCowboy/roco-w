import type { Metadata } from "next";
import type { JSONContent } from "@tiptap/core";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogArticleView, type BlogArticleUi } from "@/components/pages/BlogPage/BlogArticleView";
import { Footer } from "@/components/layout/Footer/Footer";
import type { BlogPost } from "@/lib/blog";
import { getPreviewLocalization } from "@/lib/admin/content-service";
import { verifyPreviewToken } from "@/lib/admin/preview-token";
import { stableArticleSeed, tableOfContentsForDocument } from "@/lib/content/article-view";
import { getPublishedContentRepository } from "@/lib/content/content-source";

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
    sourceId: item.sourceId ?? stableArticleSeed(item.postId),
    locale: item.locale,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    category: item.category,
    tags: item.tags,
    publishedAt: item.publishedAt?.toISOString() ?? now,
    updatedAt: now,
    author: item.authorName,
    readingMinutes: item.readingMinutes,
    featuredImage: item.featuredImage,
    featuredImageAlt: item.featuredImageAlt,
    featuredImageWidth: item.featuredImageWidth,
    featuredImageHeight: item.featuredImageHeight,
    contentHtml: item.renderedHtml,
    tableOfContents: tableOfContentsForDocument(item.editorDocument as JSONContent),
  };
  const repository = getPublishedContentRepository();
  const [summaries, related] = await Promise.all([
    repository.listPosts(locale),
    repository.listRelatedPosts(post),
  ]);
  const recent = summaries.filter((summary) => summary.slug !== post.slug).slice(0, 4);

  return <main id="main-content"><BlogArticleView post={post} related={related} recent={recent} locale={locale} ui={ui} /><Footer /></main>;
}
