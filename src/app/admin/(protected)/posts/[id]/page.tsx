import type { JSONContent } from "@tiptap/core";
import { notFound } from "next/navigation";
import { getPostCategoryState } from "@/lib/admin/category-service";
import { ContentNotFoundError, getAdminLocalization, getAdminSeoChecks, listAdminCategories, listAdminRevisions } from "@/lib/admin/content-service";
import { contentLocales } from "@/lib/admin/content-locales";
import { isMediaStorageConfigured } from "@/lib/admin/media-storage";
import { requireAdminSession } from "@/lib/admin/session";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { EditorWorkspace } from "./EditorWorkspace";

export default async function AdminPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdminSession();
  let item;
  let revisions;
  let categoryState;
  let categories;
  try {
    [item, revisions, categoryState, categories] = await Promise.all([
      getAdminLocalization(id), listAdminRevisions(id), getPostCategoryState(id), listAdminCategories(),
    ]);
  } catch (error) {
    if (error instanceof ContentNotFoundError) notFound();
    throw error;
  }
  return <EditorWorkspace
      initial={{
        id: item.id, postId: item.postId, locale: item.locale, status: item.status, version: item.version,
        title: item.title, slug: item.slug, excerpt: item.excerpt, authorName: item.authorName,
        document: item.editorDocument as JSONContent,
        seo: {
          title: item.seoTitle, description: item.seoDescription, canonicalOverride: item.canonicalOverride,
          noIndex: item.noIndex, noFollow: item.noFollow, socialTitle: item.socialTitle,
          socialDescription: item.socialDescription, featuredMediaId: item.featuredMediaId,
          featuredImageAlt: item.featuredImageAlt, socialMediaId: item.socialMediaId,
        },
        translations: item.translations,
      }}
      revisions={revisions.map((revision) => ({
        ...revision,
        editorDocument: revision.editorDocument as JSONContent,
        createdAt: revision.createdAt.toISOString(),
      }))}
      availableLocales={contentLocales.filter((locale) => !item.translations.some((translation) => translation.locale === locale))}
      mediaConfigured={isMediaStorageConfigured()}
      initialSeoChecks={await getAdminSeoChecks(id)}
      category={{
        // Label each category in the article's language, falling back to English, then any.
        options: [...Map.groupBy(categories, (entry) => entry.id)].map(([categoryId, names]) => ({
          id: categoryId,
          label: (names.find((entry) => entry.locale === item.locale) ?? names.find((entry) => entry.locale === "en") ?? names[0]).name,
        })),
        initialCategoryId: categoryState.categoryId,
        // Mirrors setPostCategory: live articles need publish permission (the server enforces it).
        lockedReason: !hasAdminPermission(session.role, "content:publish")
          && item.translations.some((translation) => ["published", "scheduled", "archived"].includes(translation.status))
          ? "This article is live, so changing its category needs publish permission."
          : null,
        importedCategoryName: categoryState.importedCategoryName,
      }}
      workflowPermissions={{
        write: hasAdminPermission(session.role, "content:write"),
        review: hasAdminPermission(session.role, "content:review"),
        publish: hasAdminPermission(session.role, "content:publish"),
        archive: hasAdminPermission(session.role, "content:archive"),
      }}
    />;
}
