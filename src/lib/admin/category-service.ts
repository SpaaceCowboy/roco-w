import "server-only";

import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql, type SQLWrapper } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { auditEvents, categories, categoryLocalizations, postCategories, postLocalizations, postRevisions, posts } from "@/db/schema";
import { publishedArticlePath, publishedBlogIndexPath } from "@/config/blog-routing";
import { categoryInputSchema, type ContentLocale } from "./content-validation";
import { ContentNotFoundError } from "./content-service";
import { AdminApiError } from "./errors";
import { adminEvents, reportAdminFailure } from "./observability";
import { hasAdminPermission, requireAdminPermission } from "./permissions";
import type { AdminSession } from "./session";

/** Route ids are UUIDs; anything else is a 400, not a database error. */
const categoryIdSchema = z.string().uuid();

export type AdminCategory = {
  id: string;
  updatedAt: Date;
  usage: number;
  localizations: Array<{ locale: ContentLocale; name: string; slug: string }>;
};

/** Every category with its localizations and how many articles use it. */
export async function listCategoriesForAdmin(session: AdminSession): Promise<AdminCategory[]> {
  requireAdminPermission(session.role, "content:read");
  const database = getDatabase();
  const [rows, localizations, usage] = await Promise.all([
    database.select({ id: categories.id, updatedAt: categories.updatedAt }).from(categories).orderBy(asc(categories.createdAt)),
    database.select().from(categoryLocalizations).orderBy(asc(categoryLocalizations.locale)),
    database.select({ categoryId: postCategories.categoryId, usage: count() })
      .from(postCategories)
      .innerJoin(posts, eq(posts.id, postCategories.postId))
      .where(isNull(posts.deletedAt))
      .groupBy(postCategories.categoryId),
  ]);
  const usageById = new Map(usage.map((row) => [row.categoryId, Number(row.usage)]));
  return rows.map((row) => ({
    ...row,
    usage: usageById.get(row.id) ?? 0,
    localizations: localizations
      .filter((item) => item.categoryId === row.id)
      .map(({ locale, name, slug }) => ({ locale, name, slug })),
  }));
}

export async function createCategory(raw: unknown, session: AdminSession): Promise<{ id: string }> {
  requireAdminPermission(session.role, "taxonomy:write");
  const input = categoryInputSchema.parse(raw);
  return getDatabase().transaction(async (tx) => {
    const [category] = await tx.insert(categories).values({}).returning({ id: categories.id });
    await tx.insert(categoryLocalizations).values(input.localizations.map((item) => ({ ...item, categoryId: category.id })));
    await tx.insert(auditEvents).values({
      actorId: session.userId, action: "taxonomy.category.create", entityType: "category", entityId: category.id,
      outcome: "success", correlationId: crypto.randomUUID(), metadata: { locales: input.localizations.map((item) => item.locale) },
    });
    return category;
  });
}

/** Replaces the category's localizations; public pages that show it are refreshed. */
export async function updateCategory(rawId: string, raw: unknown, session: AdminSession): Promise<{ id: string }> {
  requireAdminPermission(session.role, "taxonomy:write");
  const id = categoryIdSchema.parse(rawId);
  const input = categoryInputSchema.parse(raw);
  await getDatabase().transaction(async (tx) => {
    const [existing] = await tx.update(categories).set({ updatedAt: new Date() }).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!existing) throw new ContentNotFoundError();
    await tx.delete(categoryLocalizations).where(eq(categoryLocalizations.categoryId, id));
    await tx.insert(categoryLocalizations).values(input.localizations.map((item) => ({ ...item, categoryId: id })));
    await tx.insert(auditEvents).values({
      actorId: session.userId, action: "taxonomy.category.update", entityType: "category", entityId: id,
      outcome: "success", correlationId: crypto.randomUUID(), metadata: { locales: input.localizations.map((item) => item.locale) },
    });
  });
  await refreshCategorySurfaces(id);
  return { id };
}

/** Deletion is refused while any article uses the category (the FK is `restrict` as well). */
export async function deleteCategory(rawId: string, session: AdminSession): Promise<void> {
  requireAdminPermission(session.role, "taxonomy:write");
  const id = categoryIdSchema.parse(rawId);
  await getDatabase().transaction(async (tx) => {
    const [usage] = await tx.select({ usage: count() }).from(postCategories)
      .innerJoin(posts, eq(posts.id, postCategories.postId))
      .where(and(eq(postCategories.categoryId, id), isNull(posts.deletedAt)));
    const used = Number(usage?.usage ?? 0);
    if (used > 0) throw new AdminApiError(409, `This category is used by ${used} article${used === 1 ? "" : "s"}. It can be deleted once no articles use it.`);
    // Soft-deleted articles still hold FK rows (restrict); they are invisible everywhere else, so release them.
    const released = await tx.delete(postCategories)
      .where(and(eq(postCategories.categoryId, id), inArray(postCategories.postId, tx.select({ id: posts.id }).from(posts).where(isNotNull(posts.deletedAt)))))
      .returning({ postId: postCategories.postId });
    const [deleted] = await tx.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!deleted) throw new ContentNotFoundError();
    await tx.insert(auditEvents).values({
      actorId: session.userId, action: "taxonomy.category.delete", entityType: "category", entityId: id,
      outcome: "success", correlationId: crypto.randomUUID(), metadata: { releasedDeletedPostLinks: released.length },
    });
  });
}

/** Published articles in the category and their blog indexes show its name. */
async function refreshCategorySurfaces(categoryId: string): Promise<void> {
  refreshPaths(await publishedPathsForPosts(postIdsInCategory(categoryId)));
}

const setPostCategorySchema = z.object({ categoryId: z.string().uuid().nullable() });

/**
 * The article's assigned category, plus the category name stored in its imported
 * revision metadata (the public site currently prefers that one when present).
 */
export async function getPostCategoryState(localizationId: string): Promise<{ categoryId: string | null; importedCategoryName: string | null }> {
  const database = getDatabase();
  const [item] = await database.select({ postId: postLocalizations.postId, publishedRevisionNumber: postLocalizations.publishedRevisionNumber })
    .from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
  if (!item) throw new ContentNotFoundError();
  const [assigned, [revision]] = await Promise.all([
    database.select({ categoryId: postCategories.categoryId }).from(postCategories).where(eq(postCategories.postId, item.postId)).limit(1),
    database.select({ name: sql<string | null>`${postRevisions.metadata} -> 'category' ->> 'name'` })
      .from(postRevisions)
      .where(and(
        eq(postRevisions.localizationId, localizationId),
        item.publishedRevisionNumber ? eq(postRevisions.revisionNumber, item.publishedRevisionNumber) : undefined,
      ))
      .orderBy(desc(postRevisions.revisionNumber))
      .limit(1),
  ]);
  return { categoryId: assigned[0]?.categoryId ?? null, importedCategoryName: revision?.name ?? null };
}

/** Statuses whose localizations are (or will be, or were) visible on the public site. */
const liveStatuses = ["published", "scheduled", "archived"] as const;

/**
 * Assigns one category to the whole article (all languages), or clears it. The category
 * shows on public pages immediately, so live articles need publish permission.
 */
export async function setPostCategory(rawLocalizationId: string, raw: unknown, session: AdminSession): Promise<{ categoryId: string | null }> {
  requireAdminPermission(session.role, "content:write");
  const localizationId = categoryIdSchema.parse(rawLocalizationId);
  const { categoryId } = setPostCategorySchema.parse(raw);
  const postId = await getDatabase().transaction(async (tx) => {
    const [item] = await tx.select({ postId: postLocalizations.postId }).from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
    if (!item) throw new ContentNotFoundError();
    if (!hasAdminPermission(session.role, "content:publish")) {
      const [live] = await tx.select({ id: postLocalizations.id }).from(postLocalizations)
        .where(and(eq(postLocalizations.postId, item.postId), inArray(postLocalizations.status, liveStatuses))).limit(1);
      if (live) throw new AdminApiError(403, "This article is live. Changing its category needs publish permission.");
    }
    if (categoryId) {
      const [exists] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
      if (!exists) throw new AdminApiError(400, "That category no longer exists. Reload and choose another.");
    }
    await tx.delete(postCategories).where(eq(postCategories.postId, item.postId));
    if (categoryId) await tx.insert(postCategories).values({ postId: item.postId, categoryId });
    await tx.insert(auditEvents).values({
      actorId: session.userId, action: "content.category.set", entityType: "post", entityId: item.postId,
      outcome: "success", correlationId: crypto.randomUUID(), metadata: { categoryId },
    });
    return item.postId;
  });
  refreshPaths(await publishedPathsForPosts([postId]));
  return { categoryId };
}

async function publishedPathsForPosts(postIds: string[] | SQLWrapper): Promise<Set<string>> {
  const published = await getDatabase()
    .select({ locale: postLocalizations.locale, slug: postLocalizations.slug })
    .from(postLocalizations)
    .where(and(inArray(postLocalizations.postId, postIds), isNotNull(postLocalizations.publishedAt)));
  return new Set(published.flatMap((item) => [publishedArticlePath(item.locale, item.slug), publishedBlogIndexPath(item.locale)]));
}

function postIdsInCategory(categoryId: string) {
  return getDatabase().select({ id: postCategories.postId }).from(postCategories).where(eq(postCategories.categoryId, categoryId));
}

function refreshPaths(targets: Set<string>): void {
  for (const target of targets) {
    try {
      revalidatePath(target);
    } catch (error) {
      reportAdminFailure(adminEvents.cacheRefresh, { target, errorCode: error instanceof Error ? error.name : "UnknownError" });
    }
  }
}
