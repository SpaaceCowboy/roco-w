import "server-only";

import { and, asc, countDistinct, desc, eq, gte, ilike, inArray, isNull, lt, lte, max, ne, or, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db/client";
import {
  adminUsers,
  auditEvents,
  categoryLocalizations,
  media,
  mediaUsages,
  postCategories,
  postLocalizations,
  postRevisions,
  postSlugHistory,
  posts,
} from "@/db/schema";
import { emptyEditorDocument, normalizeHeadingIds, readingMinutesFor, renderEditorDocument } from "@/lib/content/editor/document";
import { importHtmlToDocument } from "@/lib/content/editor/html-import";
import { generateJSON } from "@tiptap/html/server";
import { analyzeArticleSeo, normalizeCanonicalOverride } from "@/lib/content/article-seo";
import { SITE_URL } from "@/config/site-url";
import { publishedArticlePath, publishedBlogIndexPath } from "@/config/blog-routing";
import type { AdminSession } from "./session";
import {
  createPostSchema,
  createTranslationSchema,
  deleteContentSchema,
  postListFiltersSchema,
  saveDraftSchema,
  slugFromTitle,
  type ContentLocale,
  type SaveDraftInput,
} from "./content-validation";
import { contentLocales } from "./content-locales";
import { canDeleteLocalization, canDeletePost, type DeletionDecision } from "./deletion-policy";
import { ContentDeletionError } from "./errors";
import { adminEvents, reportAdminFailure, reportAdminSuccess } from "./observability";
import { hasAdminPermission, requireAdminPermission } from "./permissions";
import { getMediaPublicUrl } from "./media-storage";
import {
  dashboardFilterKey,
  dashboardQuerySchema,
  decodeDashboardCursor,
  encodeDashboardCursor,
  type DashboardCursor,
  type DashboardOrder,
  type DashboardQuery,
  type DashboardSort,
} from "./dashboard-query";

export class ContentConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super("This draft changed in another session");
    this.name = "ContentConflictError";
  }
}

export class ContentNotFoundError extends Error {
  constructor() {
    super("Content was not found");
    this.name = "ContentNotFoundError";
  }
}

export class ContentLockedError extends Error {
  constructor(readonly status: string) {
    super(`Content in ${status} state must return to draft before editing`);
    this.name = "ContentLockedError";
  }
}

export class ContentRouteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentRouteConflictError";
  }
}

export class ContentSeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentSeoError";
  }
}

export type PostListFilters = ReturnType<typeof postListFiltersSchema.parse>;

const effectiveAuthor = sql<string>`coalesce(${adminUsers.displayName}, ${postLocalizations.authorName})`;

function dashboardSortColumn(sort: DashboardSort) {
  if (sort === "title") return postLocalizations.title;
  if (sort === "author") return effectiveAuthor;
  if (sort === "status") return postLocalizations.status;
  if (sort === "locale") return postLocalizations.locale;
  return postLocalizations.updatedAt;
}

function dashboardCursorValue(item: { updatedAt: Date; title: string; effectiveAuthor: string; status: string; locale: string }, sort: DashboardSort): string {
  if (sort === "updated") return item.updatedAt.toISOString();
  if (sort === "title") return item.title;
  if (sort === "author") return item.effectiveAuthor;
  if (sort === "status") return item.status;
  return item.locale;
}

function dashboardCursorComparable(cursor: DashboardCursor, sort: DashboardSort): string | Date {
  return sort === "updated" ? new Date(cursor.value) : cursor.value;
}

function dashboardCursorCondition(query: DashboardQuery, cursor: DashboardCursor | undefined): SQL | undefined {
  if (!cursor) return undefined;
  const column = dashboardSortColumn(query.sort);
  const value = dashboardCursorComparable(cursor, query.sort);
  const ascendingFromCursor = (query.order === "asc") === (cursor.direction === "next");
  const comparison = ascendingFromCursor ? sql.raw(">") : sql.raw("<");
  return sql`(${column} ${comparison} ${value} or (${column} = ${value} and ${postLocalizations.id} ${comparison} ${cursor.id}))`;
}

function dashboardCursorFor(
  item: { id: string; updatedAt: Date; title: string; effectiveAuthor: string; status: string; locale: string },
  query: DashboardQuery,
  direction: DashboardCursor["direction"],
  page: number,
  filterKey: string,
): string {
  return encodeDashboardCursor({
    version: 1,
    direction,
    sort: query.sort,
    order: query.order,
    value: dashboardCursorValue(item, query.sort),
    id: item.id,
    page,
    filterKey,
  });
}

function addDashboardViewConditions(conditions: Array<SQL | undefined>, query: DashboardQuery, actorId: string, now: Date): void {
  if (query.view === "mine") {
    conditions.push(eq(posts.createdById, actorId), eq(postLocalizations.status, "draft"));
  } else if (query.view === "review") {
    conditions.push(eq(postLocalizations.status, "review"));
  } else if (query.view === "scheduled") {
    conditions.push(
      eq(postLocalizations.status, "scheduled"),
      gte(postLocalizations.scheduledAt, now),
      lte(postLocalizations.scheduledAt, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000)),
    );
  } else if (query.view === "recent") {
    conditions.push(
      eq(postLocalizations.status, "published"),
      gte(postLocalizations.publishedAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000)),
    );
  } else if (query.view === "attention") {
    conditions.push(eq(postLocalizations.status, "scheduled"), lt(postLocalizations.scheduledAt, now));
  } else if (query.view === "untranslated") {
    conditions.push(sql`(select count(*) from ${postLocalizations} "other_locale"
      where "other_locale"."post_id" = ${postLocalizations.postId}) < ${contentLocales.length}`);
  }
}

export async function listAdminPosts(rawFilters: unknown, session: AdminSession, now = new Date()) {
  requireAdminPermission(session.role, "content:read");
  const filters = dashboardQuerySchema.parse(rawFilters);
  const actorId = session.userId;
  const conditions: Array<SQL | undefined> = [isNull(posts.deletedAt)];
  if (filters.locale) conditions.push(eq(postLocalizations.locale, filters.locale));
  if (filters.status) conditions.push(eq(postLocalizations.status, filters.status));
  if (filters.author) conditions.push(eq(posts.createdById, filters.author));
  if (filters.from) conditions.push(gte(postLocalizations.updatedAt, filters.from));
  // `to` names a calendar date; include the whole day rather than just its start.
  if (filters.to) conditions.push(lt(postLocalizations.updatedAt, new Date(filters.to.getTime() + 86_400_000)));
  if (filters.q) conditions.push(or(ilike(postLocalizations.title, `%${filters.q}%`), ilike(postLocalizations.slug, `%${filters.q}%`)));
  // An EXISTS subquery avoids joining post_categories, which would multiply
  // rows for posts with several categories and force a DISTINCT.
  if (filters.category) {
    conditions.push(sql`exists (select 1 from ${postCategories}
      where ${postCategories.postId} = ${posts.id} and ${postCategories.categoryId} = ${filters.category})`);
  }
  addDashboardViewConditions(conditions, filters, actorId, now);

  const filterKey = dashboardFilterKey(filters, actorId);
  const cursor = decodeDashboardCursor(filters.cursor, filterKey, { sort: filters.sort, order: filters.order });
  const cursorCondition = dashboardCursorCondition(filters, cursor);
  const requestedOrder: DashboardOrder = cursor?.direction === "previous"
    ? (filters.order === "asc" ? "desc" : "asc")
    : filters.order;
  const order = requestedOrder === "asc" ? asc : desc;
  const sortColumn = dashboardSortColumn(filters.sort);
  const pageSize = filters.pageSize;
  const database = getDatabase();

  const [rows, totalResult] = await Promise.all([
    database
      .select({
        id: postLocalizations.id,
        postId: postLocalizations.postId,
        locale: postLocalizations.locale,
        title: postLocalizations.title,
        slug: postLocalizations.slug,
        status: postLocalizations.status,
        version: postLocalizations.version,
        authorName: postLocalizations.authorName,
        effectiveAuthor,
        createdById: posts.createdById,
        updatedAt: postLocalizations.updatedAt,
      })
      .from(postLocalizations)
      .innerJoin(posts, eq(posts.id, postLocalizations.postId))
      .leftJoin(adminUsers, eq(adminUsers.id, posts.createdById))
      .where(and(...conditions, cursorCondition))
      .orderBy(order(sortColumn), order(postLocalizations.id))
      .limit(pageSize + 1),
    // Count only needs the filter joins; the author join feeds display only.
    database
      .select({ total: countDistinct(postLocalizations.id) })
      .from(postLocalizations)
      .innerJoin(posts, eq(posts.id, postLocalizations.postId))
      .where(and(...conditions)),
  ]);

  const hasMore = rows.length > pageSize;
  let items = rows.slice(0, pageSize);
  if (cursor?.direction === "previous") items = items.reverse();
  const page = cursor?.page ?? 1;
  const total = Number(totalResult[0]?.total ?? 0);

  const actor = { role: session.role, userId: session.userId };
  const siblingRows = items.length === 0 ? [] : await database
    .select({
      id: postLocalizations.id,
      postId: postLocalizations.postId,
      locale: postLocalizations.locale,
      slug: postLocalizations.slug,
      status: postLocalizations.status,
      publishedAt: postLocalizations.publishedAt,
      createdById: posts.createdById,
    })
    .from(postLocalizations)
    .innerJoin(posts, eq(posts.id, postLocalizations.postId))
    .where(and(inArray(postLocalizations.postId, items.map((item) => item.postId)), isNull(posts.deletedAt)));
  const siblingsByPost = new Map<string, typeof siblingRows>();
  const localesByPost = new Map<string, string[]>();
  for (const sibling of siblingRows) {
    const group = siblingsByPost.get(sibling.postId);
    if (group) group.push(sibling);
    else siblingsByPost.set(sibling.postId, [sibling]);
    const locales = localesByPost.get(sibling.postId);
    if (locales) locales.push(sibling.locale);
    else localesByPost.set(sibling.postId, [sibling.locale]);
  }

  const itemsWithDeletion = items.map((item) => {
    const present = localesByPost.get(item.postId) ?? [item.locale];
    return {
      ...item,
      deletion: {
        localization: canDeleteLocalization(actor, item),
        post: canDeletePost(actor, siblingsByPost.get(item.postId) ?? [item]),
      } satisfies { localization: DeletionDecision; post: DeletionDecision },
      missingLocales: contentLocales.filter((locale) => !present.includes(locale)) as ContentLocale[],
    };
  });

  return {
    items: itemsWithDeletion,
    total,
    page,
    pageSize,
    nextCursor: items.length > 0 && ((cursor?.direction !== "previous" && hasMore) || cursor?.direction === "previous")
      ? dashboardCursorFor(items.at(-1)!, filters, "next", page + 1, filterKey)
      : undefined,
    previousCursor: items.length > 0 && page > 1
      ? dashboardCursorFor(items[0], filters, "previous", page - 1, filterKey)
      : undefined,
    query: filters,
  };
}

export async function listAdminAuthors() {
  return getDatabase()
    .select({ id: adminUsers.id, name: adminUsers.displayName, email: adminUsers.normalizedEmail })
    .from(adminUsers)
    .where(eq(adminUsers.isActive, true))
    .orderBy(asc(adminUsers.displayName), asc(adminUsers.normalizedEmail));
}

export async function listAdminCategories(locale?: ContentLocale) {
  return getDatabase().select({ id: categoryLocalizations.categoryId, locale: categoryLocalizations.locale, name: categoryLocalizations.name })
    .from(categoryLocalizations)
    .where(locale ? eq(categoryLocalizations.locale, locale) : undefined)
    .orderBy(asc(categoryLocalizations.name));
}

export type DashboardSummary = {
  total: number;
  mine: number;
  review: number;
  scheduled: number;
  recent: number;
  attention: number;
  untranslated: number;
};

/**
 * Global editorial counts for the dashboard overview. Independent of the active
 * filters, so the overview always reflects the whole workspace. Each count
 * mirrors the matching view condition in `addDashboardViewConditions`.
 */
export async function getDashboardSummary(session: AdminSession, now = new Date()): Promise<DashboardSummary> {
  requireAdminPermission(session.role, "content:read");
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000);
  const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const [row] = await getDatabase()
    .select({
      total: sql<number>`count(*)`,
      mine: sql<number>`count(*) filter (where ${posts.createdById} = ${session.userId} and ${postLocalizations.status} = 'draft')`,
      review: sql<number>`count(*) filter (where ${postLocalizations.status} = 'review')`,
      scheduled: sql<number>`count(*) filter (where ${postLocalizations.status} = 'scheduled' and ${postLocalizations.scheduledAt} >= ${now} and ${postLocalizations.scheduledAt} <= ${sevenDays})`,
      recent: sql<number>`count(*) filter (where ${postLocalizations.status} = 'published' and ${postLocalizations.publishedAt} >= ${thirtyDays})`,
      attention: sql<number>`count(*) filter (where ${postLocalizations.status} = 'scheduled' and ${postLocalizations.scheduledAt} < ${now})`,
      untranslated: sql<number>`count(*) filter (where (select count(*) from ${postLocalizations} "other_locale"
        where "other_locale"."post_id" = ${postLocalizations.postId}) < ${contentLocales.length})`,
    })
    .from(postLocalizations)
    .innerJoin(posts, eq(posts.id, postLocalizations.postId))
    .where(isNull(posts.deletedAt));
  return {
    total: Number(row?.total ?? 0),
    mine: Number(row?.mine ?? 0),
    review: Number(row?.review ?? 0),
    scheduled: Number(row?.scheduled ?? 0),
    recent: Number(row?.recent ?? 0),
    attention: Number(row?.attention ?? 0),
    untranslated: Number(row?.untranslated ?? 0),
  };
}

export async function getAdminLocalization(localizationId: string) {
  const [item] = await getDatabase()
    .select()
    .from(postLocalizations)
    .where(eq(postLocalizations.id, localizationId))
    .limit(1);
  if (!item) throw new ContentNotFoundError();

  const translations = await getDatabase()
    .select({ id: postLocalizations.id, locale: postLocalizations.locale, status: postLocalizations.status, title: postLocalizations.title })
    .from(postLocalizations)
    .where(eq(postLocalizations.postId, item.postId))
    .orderBy(asc(postLocalizations.locale));

  return { ...item, translations };
}

export async function getAdminSeoChecks(localizationId: string) {
  const item = await getAdminLocalization(localizationId);
  const effectiveTitle = item.seoTitle || item.title;
  const effectiveDescription = item.seoDescription || item.excerpt;
  const [duplicateTitle] = await getDatabase().select({ id: postLocalizations.id }).from(postLocalizations).where(and(
    ne(postLocalizations.id, localizationId),
    or(eq(postLocalizations.seoTitle, effectiveTitle), and(isNull(postLocalizations.seoTitle), eq(postLocalizations.title, effectiveTitle))),
  )).limit(1);
  const [duplicateDescription] = effectiveDescription ? await getDatabase().select({ id: postLocalizations.id }).from(postLocalizations).where(and(
    ne(postLocalizations.id, localizationId),
    or(eq(postLocalizations.seoDescription, effectiveDescription), and(isNull(postLocalizations.seoDescription), eq(postLocalizations.excerpt, effectiveDescription))),
  )).limit(1) : [];
  const [routes, social] = await Promise.all([
    getDatabase().select({ locale: postLocalizations.locale, slug: postLocalizations.slug }).from(postLocalizations),
    item.socialMediaId
      ? getDatabase().select({ width: media.width, height: media.height, byteSize: media.byteSize }).from(media).where(eq(media.id, item.socialMediaId)).limit(1)
      : Promise.resolve([]),
  ]);
  return analyzeArticleSeo({
    title: item.title, excerpt: item.excerpt, seoTitle: item.seoTitle, seoDescription: item.seoDescription,
    featuredMediaId: item.featuredMediaId, featuredImageAlt: item.featuredImageAlt,
    socialMedia: social[0] ?? null, document: item.editorDocument as Parameters<typeof analyzeArticleSeo>[0]["document"],
    duplicateTitle: Boolean(duplicateTitle), duplicateDescription: Boolean(duplicateDescription),
    knownInternalPaths: new Set(["/", ...routes.map((route) => publishedBlogIndexPath(route.locale)), ...routes.map((route) => publishedArticlePath(route.locale, route.slug))]),
  });
}

export async function createAdminPost(rawInput: unknown, session: AdminSession) {
  requireAdminPermission(session.role, "content:write");
  const input = createPostSchema.parse(rawInput);
  const seedDocument = input.html?.trim() ? importHtmlToDocument(input.html, generateJSON).document : emptyEditorDocument;
  const rendered = renderEditorDocument(seedDocument);
  const now = new Date();

  return getDatabase().transaction(async (tx) => {
    const [post] = await tx.insert(posts).values({ defaultLocale: input.locale, createdById: session.userId }).returning({ id: posts.id });
    const [localization] = await tx.insert(postLocalizations).values({
      postId: post.id,
      locale: input.locale,
      slug: slugFromTitle(input.title),
      title: input.title,
      authorName: input.authorName,
      editorDocument: seedDocument,
      renderedHtml: rendered.html,
      createdAt: now,
      updatedAt: now,
    }).returning();
    await tx.insert(postRevisions).values({
      localizationId: localization.id,
      revisionNumber: 1,
      title: localization.title,
      slug: localization.slug,
      excerpt: localization.excerpt,
      editorDocument: localization.editorDocument,
      renderedHtml: localization.renderedHtml,
      metadata: { reason: "created", authorName: localization.authorName },
      createdById: session.userId,
    });
    await tx.insert(auditEvents).values({
      actorId: session.userId,
      action: "content.create",
      entityType: "post_localization",
      entityId: localization.id,
      outcome: "success",
      correlationId: crypto.randomUUID(),
      metadata: { locale: input.locale },
    });
    return localization;
  });
}

/**
 * Permanently deletes a localization or a whole post. Atomic: the policy check,
 * the version check, the delete, and the audit record share one transaction.
 * Published content is refused (archive first) and archived content is
 * administrator-only, both enforced here rather than in the interface.
 */
export async function deleteAdminContent(
  localizationId: string,
  rawInput: unknown,
  session: AdminSession,
) {
  requireAdminPermission(session.role, "content:delete");
  const input = deleteContentSchema.parse(rawInput);

  const result = await getDatabase().transaction(async (tx) => {
    const [target] = await tx.select({
      id: postLocalizations.id,
      postId: postLocalizations.postId,
      locale: postLocalizations.locale,
      slug: postLocalizations.slug,
      status: postLocalizations.status,
      version: postLocalizations.version,
      createdById: posts.createdById,
    }).from(postLocalizations)
      .innerJoin(posts, eq(posts.id, postLocalizations.postId))
      .where(and(eq(postLocalizations.id, localizationId), isNull(posts.deletedAt)))
      .limit(1);
    if (!target) throw new ContentNotFoundError();
    if (target.version !== input.expectedVersion) throw new ContentConflictError(target.version);

    const siblings = await tx.select({
      id: postLocalizations.id,
      postId: postLocalizations.postId,
      locale: postLocalizations.locale,
      slug: postLocalizations.slug,
      status: postLocalizations.status,
      publishedAt: postLocalizations.publishedAt,
      createdById: posts.createdById,
    }).from(postLocalizations)
      .innerJoin(posts, eq(posts.id, postLocalizations.postId))
      .where(eq(postLocalizations.postId, target.postId));

    const actor = { role: session.role, userId: session.userId };
    const anchor = siblings.find((sibling) => sibling.id === target.id) ?? { ...target, publishedAt: null };
    const decision = input.scope === "post"
      ? canDeletePost(actor, siblings)
      : canDeleteLocalization(actor, anchor);

    const correlationId = crypto.randomUUID();
    const entityType = input.scope === "post" ? "post" : "post_localization";
    const entityId = input.scope === "post" ? target.postId : target.id;

    if (!decision.allowed) {
      await tx.insert(auditEvents).values({
        actorId: session.userId,
        action: "content.delete",
        entityType,
        entityId,
        outcome: "denied",
        correlationId,
        metadata: { scope: input.scope, locale: target.locale, status: target.status, reason: decision.code },
      });
      throw new ContentDeletionError(decision.code, decision.message);
    }

    const wholePost = input.scope === "post" || siblings.length === 1;
    const deleted = wholePost
      ? await tx.delete(posts).where(eq(posts.id, target.postId)).returning({ id: posts.id })
      : await tx.delete(postLocalizations).where(eq(postLocalizations.id, target.id)).returning({ id: postLocalizations.id });
    if (deleted.length === 0) {
      throw new ContentNotFoundError();
    }

    await tx.insert(auditEvents).values({
      actorId: session.userId,
      action: "content.delete",
      entityType: wholePost ? "post" : "post_localization",
      entityId: wholePost ? target.postId : target.id,
      outcome: "success",
      correlationId,
      metadata: {
        scope: wholePost ? "post" : "localization",
        locale: target.locale,
        previousStatus: target.status,
        deletedLocalizations: wholePost ? siblings.length : 1,
      },
    });

    const removed = wholePost ? siblings : [anchor];
    return {
      postId: target.postId,
      locale: target.locale,
      slug: target.slug,
      wasPublished: removed.some((item) => item.publishedAt !== null),
      removedPublicSurfaces: removed
        .filter((item) => item.publishedAt !== null)
        .flatMap((item) => [
          publishedArticlePath(item.locale, item.slug),
          publishedBlogIndexPath(item.locale),
          `${publishedBlogIndexPath(item.locale)}/feed.xml`,
        ]),
      deletedLocalizations: wholePost ? siblings.length : 1,
    };
  });

  if (result.wasPublished) {
    const targets = [...new Set([...result.removedPublicSurfaces, "/sitemap.xml"])];
    for (const target of targets) {
      try {
        revalidatePath(target);
      } catch (error) {
        reportAdminFailure(adminEvents.contentDelete, {
          target,
          errorCode: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }
  reportAdminSuccess(adminEvents.contentDelete, {
    scope: input.scope,
    locale: result.locale,
    deletedLocalizations: result.deletedLocalizations,
  });
  return result;
}

export async function saveAdminDraft(localizationId: string, rawInput: unknown, session: AdminSession) {
  requireAdminPermission(session.role, "content:write");
  const input = saveDraftSchema.parse(rawInput) as SaveDraftInput;
  const { inspection } = renderEditorDocument(input.document);
  const mediaIds = [...new Set([
    ...inspection.media.map((item) => item.mediaId),
    ...(input.seo.featuredMediaId ? [input.seo.featuredMediaId] : []),
    ...(input.seo.socialMediaId ? [input.seo.socialMediaId] : []),
  ])];

  return getDatabase().transaction(async (tx) => {
    const [current] = await tx.select().from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
    if (!current) throw new ContentNotFoundError();
    if (current.version !== input.version) throw new ContentConflictError(current.version);
    if (current.status !== "draft" && current.status !== "review") throw new ContentLockedError(current.status);

    const canonicalChanged = (current.canonicalOverride ?? null) !== (input.seo.canonicalOverride || null);
    if (canonicalChanged && !hasAdminPermission(session.role, "content:review")) {
      requireAdminPermission(session.role, "content:review");
    }
    const siteHost = new URL(SITE_URL).hostname.toLowerCase();
    const allowedCanonicalHosts = new Set([
      siteHost,
      ...(process.env.ADMIN_ALLOWED_CANONICAL_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean),
    ]);
    let canonicalOverride: string | null;
    try {
      canonicalOverride = normalizeCanonicalOverride(input.seo.canonicalOverride, allowedCanonicalHosts);
    } catch (error) {
      throw new ContentSeoError(error instanceof Error ? error.message : "Invalid canonical URL");
    }

    if (current.slug !== input.slug) {
      for (const route of [...new Set([current.slug, input.slug])].sort()) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${current.locale}:${route}`}, 0))`);
      }
      const [historyCollision] = await tx.select({ id: postSlugHistory.id }).from(postSlugHistory)
        .where(and(eq(postSlugHistory.locale, current.locale), eq(postSlugHistory.oldSlug, input.slug))).limit(1);
      const [currentCollision] = await tx.select({ id: postLocalizations.id }).from(postLocalizations)
        .where(and(eq(postLocalizations.locale, current.locale), eq(postLocalizations.slug, input.slug), ne(postLocalizations.id, localizationId))).limit(1);
      if (historyCollision || currentCollision) throw new ContentRouteConflictError("That slug is already a current or historical route");
      await tx.insert(postSlugHistory).values({
        localizationId, locale: current.locale, oldSlug: current.slug, createdById: session.userId,
      }).onConflictDoNothing({ target: [postSlugHistory.locale, postSlugHistory.oldSlug] });
    }

    let canonicalDocument = input.document;
    const mediaById = new Map<string, { id: string; storageKey: string; width: number | null; height: number | null; byteSize: number }>();
    if (mediaIds.length) {
      const usableMedia = await tx.select({ id: media.id, storageKey: media.storageKey, width: media.width, height: media.height, byteSize: media.byteSize })
        .from(media).where(and(inArray(media.id, mediaIds), isNull(media.deletedAt)));
      if (usableMedia.length !== new Set(mediaIds).size) throw new Error("The document references unavailable media");
      for (const item of usableMedia) mediaById.set(item.id, item);
      canonicalDocument = structuredClone(input.document);
      const rewriteImages = (node: typeof canonicalDocument): void => {
        if (node.type === "image") {
          const item = mediaById.get(String(node.attrs?.mediaId));
          if (!item) throw new Error("The document references unavailable media");
          node.attrs = { ...node.attrs, src: getMediaPublicUrl(item.storageKey), width: item.width, height: item.height };
        }
        for (const child of node.content ?? []) rewriteImages(child);
      };
      rewriteImages(canonicalDocument);
    }
    canonicalDocument = normalizeHeadingIds(canonicalDocument);
    const { html } = renderEditorDocument(canonicalDocument);

    const [updated] = await tx.update(postLocalizations).set({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      authorName: input.authorName,
      editorDocument: canonicalDocument,
      renderedHtml: html,
      readingMinutes: readingMinutesFor(inspection.textLength),
      featuredMediaId: input.seo.featuredMediaId,
      featuredImageAlt: input.seo.featuredImageAlt,
      seoTitle: input.seo.title || null,
      seoDescription: input.seo.description || null,
      canonicalOverride,
      noIndex: input.seo.noIndex,
      noFollow: input.seo.noFollow,
      socialTitle: input.seo.socialTitle || null,
      socialDescription: input.seo.socialDescription || null,
      socialMediaId: input.seo.socialMediaId,
      version: input.version + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(postLocalizations.id, localizationId),
      eq(postLocalizations.version, input.version),
      inArray(postLocalizations.status, ["draft", "review"]),
    ))
      .returning();

    if (!updated) {
      const [current] = await tx.select({ version: postLocalizations.version, status: postLocalizations.status }).from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
      if (!current) throw new ContentNotFoundError();
      if (current.status !== "draft" && current.status !== "review") throw new ContentLockedError(current.status);
      throw new ContentConflictError(current.version);
    }

    const [{ value: latestRevision }] = await tx
      .select({ value: max(postRevisions.revisionNumber) })
      .from(postRevisions)
      .where(eq(postRevisions.localizationId, localizationId));
    const revisionNumber = (latestRevision ?? 0) + 1;
    await tx.insert(postRevisions).values({
      localizationId,
      revisionNumber,
      title: updated.title,
      slug: updated.slug,
      excerpt: updated.excerpt,
      editorDocument: updated.editorDocument,
      renderedHtml: updated.renderedHtml,
      featuredMediaId: updated.featuredMediaId,
      featuredImageAlt: updated.featuredImageAlt,
      seoTitle: updated.seoTitle,
      seoDescription: updated.seoDescription,
      canonicalOverride: updated.canonicalOverride,
      noIndex: updated.noIndex,
      noFollow: updated.noFollow,
      socialTitle: updated.socialTitle,
      socialDescription: updated.socialDescription,
      socialMediaId: updated.socialMediaId,
      metadata: { reason: "autosave", authorName: updated.authorName, readingMinutes: updated.readingMinutes },
      createdById: session.userId,
    });
    await tx.delete(mediaUsages).where(eq(mediaUsages.localizationId, localizationId));
    if (inspection.media.length) {
      await tx.insert(mediaUsages).values(inspection.media.map((item) => ({
        localizationId,
        mediaId: item.mediaId,
        kind: "inline" as const,
        altText: item.alt,
      })));
    }
    if (updated.featuredMediaId) {
      await tx.insert(mediaUsages).values({ localizationId, mediaId: updated.featuredMediaId, kind: "featured", altText: updated.featuredImageAlt })
        .onConflictDoUpdate({
          target: [mediaUsages.mediaId, mediaUsages.localizationId, mediaUsages.kind],
          set: { altText: updated.featuredImageAlt },
        });
    }
    if (updated.socialMediaId) {
      await tx.insert(mediaUsages).values({ localizationId, mediaId: updated.socialMediaId, kind: "social", altText: "" })
        .onConflictDoNothing();
    }
    await tx.insert(auditEvents).values({
      actorId: session.userId,
      action: "content.save",
      entityType: "post_localization",
      entityId: localizationId,
      outcome: "success",
      correlationId: crypto.randomUUID(),
      metadata: { version: updated.version, revisionNumber },
    });
    const effectiveTitle = updated.seoTitle || updated.title;
    const effectiveDescription = updated.seoDescription || updated.excerpt;
    const [duplicateTitle] = await tx.select({ id: postLocalizations.id }).from(postLocalizations).where(and(
      ne(postLocalizations.id, localizationId),
      or(eq(postLocalizations.seoTitle, effectiveTitle), and(isNull(postLocalizations.seoTitle), eq(postLocalizations.title, effectiveTitle))),
    )).limit(1);
    const [duplicateDescription] = effectiveDescription ? await tx.select({ id: postLocalizations.id }).from(postLocalizations).where(and(
      ne(postLocalizations.id, localizationId),
      or(eq(postLocalizations.seoDescription, effectiveDescription), and(isNull(postLocalizations.seoDescription), eq(postLocalizations.excerpt, effectiveDescription))),
    )).limit(1) : [];
    const routes = await tx.select({ locale: postLocalizations.locale, slug: postLocalizations.slug }).from(postLocalizations);
    const knownInternalPaths = new Set(["/", ...routes.map((route) => publishedArticlePath(route.locale, route.slug)), ...routes.map((route) => publishedBlogIndexPath(route.locale))]);
    const socialMedia = updated.socialMediaId ? mediaById.get(updated.socialMediaId) ?? null : null;
    const seoChecks = analyzeArticleSeo({
      title: updated.title, excerpt: updated.excerpt, seoTitle: updated.seoTitle, seoDescription: updated.seoDescription,
      featuredMediaId: updated.featuredMediaId, featuredImageAlt: updated.featuredImageAlt,
      socialMedia, document: canonicalDocument, duplicateTitle: Boolean(duplicateTitle),
      duplicateDescription: Boolean(duplicateDescription), knownInternalPaths,
    });
    return { item: updated, revisionNumber, seoChecks };
  });
}

export async function createAdminTranslation(postId: string, rawInput: unknown, session: AdminSession) {
  requireAdminPermission(session.role, "content:write");
  const input = createTranslationSchema.parse(rawInput);
  const rendered = renderEditorDocument(emptyEditorDocument);

  return getDatabase().transaction(async (tx) => {
    const [post] = await tx.select({ id: posts.id }).from(posts).where(and(eq(posts.id, postId), isNull(posts.deletedAt))).limit(1);
    if (!post) throw new ContentNotFoundError();
    const title = input.title ?? `Untitled ${input.locale.toUpperCase()} translation`;
    const [item] = await tx.insert(postLocalizations).values({
      postId,
      locale: input.locale,
      title,
      slug: `${slugFromTitle(title)}-${crypto.randomUUID().slice(0, 6)}`,
      excerpt: "",
      authorName: "RocoBroker Editorial",
      editorDocument: emptyEditorDocument,
      renderedHtml: rendered.html,
    }).returning();
    await tx.insert(postRevisions).values({
      localizationId: item.id,
      revisionNumber: 1,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      editorDocument: item.editorDocument,
      renderedHtml: item.renderedHtml,
      metadata: { reason: "translation-created", authorName: item.authorName },
      createdById: session.userId,
    });
    await tx.insert(auditEvents).values({
      actorId: session.userId,
      action: "content.translation.create",
      entityType: "post_localization",
      entityId: item.id,
      outcome: "success",
      correlationId: crypto.randomUUID(),
      metadata: { locale: input.locale },
    });
    return item;
  });
}

export async function listAdminRevisions(localizationId: string) {
  return getDatabase().select({
    revisionNumber: postRevisions.revisionNumber,
    title: postRevisions.title,
    slug: postRevisions.slug,
    excerpt: postRevisions.excerpt,
    editorDocument: postRevisions.editorDocument,
    renderedHtml: postRevisions.renderedHtml,
    metadata: postRevisions.metadata,
    createdAt: postRevisions.createdAt,
    createdBy: adminUsers.displayName,
  }).from(postRevisions)
    .leftJoin(adminUsers, eq(adminUsers.id, postRevisions.createdById))
    .where(eq(postRevisions.localizationId, localizationId))
    .orderBy(desc(postRevisions.revisionNumber))
    .limit(100);
}

export async function rollbackAdminRevision(localizationId: string, revisionNumber: number, version: number, session: AdminSession) {
  requireAdminPermission(session.role, "content:write");
  return getDatabase().transaction(async (tx) => {
    const [revision] = await tx.select().from(postRevisions).where(and(
      eq(postRevisions.localizationId, localizationId),
      eq(postRevisions.revisionNumber, revisionNumber),
    )).limit(1);
    if (!revision) throw new ContentNotFoundError();

    const [{ value: latestRevision }] = await tx.select({ value: max(postRevisions.revisionNumber) })
      .from(postRevisions).where(eq(postRevisions.localizationId, localizationId));
    const nextRevision = (latestRevision ?? 0) + 1;
    const metadata = revision.metadata && typeof revision.metadata === "object" ? revision.metadata as Record<string, unknown> : {};
    const [updated] = await tx.update(postLocalizations).set({
      title: revision.title,
      excerpt: revision.excerpt,
      editorDocument: revision.editorDocument,
      renderedHtml: revision.renderedHtml,
      featuredMediaId: revision.featuredMediaId,
      featuredImageAlt: revision.featuredImageAlt,
      seoTitle: revision.seoTitle,
      seoDescription: revision.seoDescription,
      canonicalOverride: revision.canonicalOverride,
      noIndex: revision.noIndex,
      noFollow: revision.noFollow,
      socialTitle: revision.socialTitle,
      socialDescription: revision.socialDescription,
      socialMediaId: revision.socialMediaId,
      authorName: typeof metadata.authorName === "string" ? metadata.authorName : "RocoBroker Editorial",
      readingMinutes: typeof metadata.readingMinutes === "number" ? metadata.readingMinutes : 1,
      status: "draft",
      version: version + 1,
      updatedAt: new Date(),
    }).where(and(eq(postLocalizations.id, localizationId), eq(postLocalizations.version, version))).returning();
    if (!updated) {
      const [current] = await tx.select({ version: postLocalizations.version }).from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
      if (!current) throw new ContentNotFoundError();
      throw new ContentConflictError(current.version);
    }
    const rollbackInspection = renderEditorDocument(revision.editorDocument as Parameters<typeof renderEditorDocument>[0]).inspection;
    await tx.delete(mediaUsages).where(eq(mediaUsages.localizationId, localizationId));
    if (rollbackInspection.media.length) {
      await tx.insert(mediaUsages).values(rollbackInspection.media.map((item) => ({
        localizationId, mediaId: item.mediaId, kind: "inline" as const, altText: item.alt,
      })));
    }
    if (revision.featuredMediaId) {
      await tx.insert(mediaUsages).values({
        localizationId, mediaId: revision.featuredMediaId, kind: "featured", altText: revision.featuredImageAlt,
      });
    }
    if (revision.socialMediaId) {
      await tx.insert(mediaUsages).values({
        localizationId, mediaId: revision.socialMediaId, kind: "social", altText: "",
      });
    }
    await tx.insert(postRevisions).values({
      localizationId,
      revisionNumber: nextRevision,
      title: revision.title,
      slug: updated.slug,
      excerpt: revision.excerpt,
      editorDocument: revision.editorDocument,
      renderedHtml: revision.renderedHtml,
      featuredMediaId: revision.featuredMediaId,
      featuredImageAlt: revision.featuredImageAlt,
      seoTitle: revision.seoTitle,
      seoDescription: revision.seoDescription,
      canonicalOverride: revision.canonicalOverride,
      noIndex: revision.noIndex,
      noFollow: revision.noFollow,
      socialTitle: revision.socialTitle,
      socialDescription: revision.socialDescription,
      socialMediaId: revision.socialMediaId,
      metadata: { ...metadata, reason: "rollback", restoredFrom: revisionNumber },
      createdById: session.userId,
    });
    await tx.insert(auditEvents).values({
      actorId: session.userId,
      action: "content.rollback",
      entityType: "post_localization",
      entityId: localizationId,
      outcome: "success",
      correlationId: crypto.randomUUID(),
      metadata: { restoredFrom: revisionNumber, revisionNumber: nextRevision },
    });
    return { item: updated, revisionNumber: nextRevision };
  });
}

export async function getPreviewLocalization(localizationId: string) {
  const [item] = await getDatabase().select().from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
  if (!item) throw new ContentNotFoundError();
  return item;
}
