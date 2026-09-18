import "server-only";

import { createHash } from "node:crypto";
import { and, asc, desc, eq, lte, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { auditEvents, postLocalizations, postRevisions, publicationOperations, publicationRefreshes } from "@/db/schema";
import type { AdminSession } from "./session";
import { requireAdminPermission } from "./permissions";
import { allowedPublicationSourceStatuses, publicationActions, publicationPermission } from "./publication-policy";
import { adminEvents, reportAdminFailure, reportAdminSuccess } from "./observability";

/** A due item older than this is treated as a scheduler delay worth alerting on. */
function scheduledDelayGraceMs(): number {
  const value = Number(process.env.ADMIN_SCHEDULED_DELAY_GRACE_MS ?? 5 * 60_000);
  return Number.isFinite(value) && value > 0 ? value : 5 * 60_000;
}

const transitionSchema = z.object({
  action: z.enum(publicationActions),
  idempotencyKey: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

export class PublicationTransitionError extends Error {
  constructor(message: string, readonly code: "invalid_transition" | "operation_in_progress" | "idempotency_conflict") {
    super(message);
    this.name = "PublicationTransitionError";
  }
}

export async function transitionPublication(localizationId: string, rawInput: unknown, session: AdminSession | null) {
  const input = transitionSchema.parse(rawInput);
  if (session) requireAdminPermission(session.role, publicationPermission(input.action));
  else if (input.action !== "publish") throw new PublicationTransitionError("System actor may only publish scheduled content", "invalid_transition");
  if (input.action === "schedule" && (!input.scheduledAt || new Date(input.scheduledAt) <= new Date())) {
    throw new PublicationTransitionError("Schedule time must be in the future", "invalid_transition");
  }
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ localizationId, action: input.action, scheduledAt: input.scheduledAt ?? null }))
    .digest("hex");

  type TransitionResult = { operationId: string; action: string; result: unknown; replayed: boolean };
  let result: TransitionResult;
  try {
    result = await getDatabase().transaction(async (tx) => {
    const [operation] = await tx.insert(publicationOperations).values({
      idempotencyKey: input.idempotencyKey,
      localizationId,
      action: input.action,
      requestHash,
      requestedById: session?.userId,
    }).onConflictDoNothing({ target: publicationOperations.idempotencyKey }).returning();

    if (!operation) {
      const [existing] = await tx.select().from(publicationOperations)
        .where(eq(publicationOperations.idempotencyKey, input.idempotencyKey)).limit(1);
      if (!existing || existing.requestHash !== requestHash) {
        throw new PublicationTransitionError("Idempotency key was already used for another request", "idempotency_conflict");
      }
      if (existing.status === "started") throw new PublicationTransitionError("This operation is still in progress", "operation_in_progress");
      return { operationId: existing.id, action: existing.action, result: existing.result, replayed: true };
    }

    const [item] = await tx.select().from(postLocalizations).where(eq(postLocalizations.id, localizationId)).limit(1);
    if (!item) throw new PublicationTransitionError("Content was not found", "invalid_transition");
    if (!allowedPublicationSourceStatuses(input.action).includes(item.status)) {
      throw new PublicationTransitionError(`Cannot ${input.action.replaceAll("_", " ")} content in ${item.status} state`, "invalid_transition");
    }
    const [{ value: latestRevision }] = await tx.select({ value: max(postRevisions.revisionNumber) })
      .from(postRevisions).where(eq(postRevisions.localizationId, localizationId));
    if (!latestRevision) throw new PublicationTransitionError("Content has no revision to transition", "invalid_transition");

    const now = new Date();
    const values: Partial<typeof postLocalizations.$inferInsert> = { updatedAt: now };
    switch (input.action) {
      case "request_review":
        Object.assign(values, { status: "review", approvedAt: null, approvedById: null, approvedRevisionNumber: null });
        break;
      case "return_to_draft":
        Object.assign(values, { status: "draft", scheduledAt: null, approvedAt: null, approvedById: null, approvedRevisionNumber: null });
        break;
      case "publish":
        if (!session && item.status !== "scheduled") throw new PublicationTransitionError("Only scheduled content can be system-published", "invalid_transition");
        if (!session && item.scheduledAt && item.scheduledAt > now) throw new PublicationTransitionError("Scheduled publication is not due", "invalid_transition");
        if (!session && (!item.approvedById || !item.approvedRevisionNumber || !item.approvedAt)) {
          throw new PublicationTransitionError("Scheduled content has no valid approval", "invalid_transition");
        }
        Object.assign(values, {
          status: "published",
          publishedAt: item.publishedAt ?? now,
          publishedRevisionNumber: item.approvedRevisionNumber ?? latestRevision,
          approvedAt: item.approvedAt ?? now,
          approvedById: item.approvedById ?? session?.userId,
          approvedRevisionNumber: item.approvedRevisionNumber ?? latestRevision,
          scheduledAt: null,
        });
        break;
      case "schedule":
        Object.assign(values, {
          status: "scheduled", scheduledAt: new Date(input.scheduledAt!), approvedAt: now,
          approvedById: session!.userId, approvedRevisionNumber: latestRevision,
        });
        break;
      case "unpublish":
        Object.assign(values, {
          status: "draft", publishedAt: null, publishedRevisionNumber: null,
          approvedAt: null, approvedById: null, approvedRevisionNumber: null,
        });
        break;
      case "archive": values.status = "archived"; break;
      case "restore": values.status = "published"; break;
    }

    const [updated] = await tx.update(postLocalizations).set(values).where(and(
      eq(postLocalizations.id, localizationId),
      eq(postLocalizations.status, item.status),
    )).returning({
      id: postLocalizations.id, locale: postLocalizations.locale, slug: postLocalizations.slug,
      title: postLocalizations.title, status: postLocalizations.status,
      publishedRevisionNumber: postLocalizations.publishedRevisionNumber,
      scheduledAt: postLocalizations.scheduledAt,
    });
    if (!updated) throw new PublicationTransitionError("Content state changed during this operation; reload and retry", "invalid_transition");
    const result = { item: updated };
    await tx.update(publicationOperations).set({ status: "succeeded", result, updatedAt: now })
      .where(eq(publicationOperations.id, operation.id));
    await tx.insert(auditEvents).values({
      actorId: session?.userId,
      action: `content.${input.action}`,
      entityType: "post_localization",
      entityId: localizationId,
      outcome: "success",
      correlationId: operation.id,
      metadata: { status: updated.status, revisionNumber: latestRevision, system: !session },
    });
    return { operationId: operation.id, action: input.action, result, replayed: false };
    });
  } catch (error) {
    if (!(error instanceof PublicationTransitionError)) {
      reportAdminFailure(adminEvents.publish, {
        action: input.action,
        errorCode: error instanceof Error ? error.name : "UnknownError",
      });
    }
    throw error;
  }
  reportAdminSuccess(adminEvents.publish, { action: input.action, replayed: result.replayed });
  return result;
}

export async function refreshPublication(operationId: string, locale: string, slug: string) {
  const targets = [`/${locale}/blog/${slug}`, `/${locale}/blog`, `/${locale}/blog/feed.xml`, "/sitemap.xml"];
  return refreshPublicationTargets(operationId, targets);
}

async function refreshPublicationTargets(operationId: string, targets: string[]) {
  const warnings: string[] = [];
  let hadFailure = false;
  for (const target of targets) {
    const startedAt = performance.now();
    let outcome: "success" | "failure" = "success";
    let errorCode: string | undefined;
    try {
      revalidatePath(target);
    } catch (error) {
      outcome = "failure";
      hadFailure = true;
      errorCode = error instanceof Error ? error.name : "UnknownError";
      warnings.push(`${target}: ${errorCode}`);
      reportAdminFailure(adminEvents.cacheRefresh, { operationId, target, errorCode });
    }
    try {
      await getDatabase().insert(publicationRefreshes).values({
        operationId, target, outcome, errorCode, latencyMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      const recordError = error instanceof Error ? error.name : "UnknownError";
      warnings.push(`${target}: refresh outcome logging failed (${recordError})`);
      reportAdminFailure(adminEvents.cacheRefresh, { operationId, target, stage: "record", errorCode: recordError });
    }
  }
  if (!hadFailure) reportAdminSuccess(adminEvents.cacheRefresh, { operationId, targets: targets.length });
  return warnings;
}

export async function retryPublicationRefresh(operationId: string, session: AdminSession) {
  requireAdminPermission(session.role, "content:publish");
  const [operation] = await getDatabase().select({
    id: publicationOperations.id,
    status: publicationOperations.status,
    action: publicationOperations.action,
    locale: postLocalizations.locale,
    slug: postLocalizations.slug,
  }).from(publicationOperations)
    .innerJoin(postLocalizations, eq(postLocalizations.id, publicationOperations.localizationId))
    .where(eq(publicationOperations.id, operationId)).limit(1);
  if (!operation || operation.status !== "succeeded") {
    throw new PublicationTransitionError("Publication operation was not found or did not succeed", "invalid_transition");
  }
  if (!["publish", "unpublish", "archive", "restore"].includes(operation.action)) {
    throw new PublicationTransitionError("This operation does not affect public caches", "invalid_transition");
  }

  const expectedTargets = [`/${operation.locale}/blog/${operation.slug}`, `/${operation.locale}/blog`, `/${operation.locale}/blog/feed.xml`, "/sitemap.xml"];
  const history = await getDatabase().select({ target: publicationRefreshes.target, outcome: publicationRefreshes.outcome })
    .from(publicationRefreshes)
    .where(eq(publicationRefreshes.operationId, operationId))
    .orderBy(desc(publicationRefreshes.createdAt));
  const latestByTarget = new Map<string, string>();
  for (const entry of history) if (!latestByTarget.has(entry.target)) latestByTarget.set(entry.target, entry.outcome);
  const retryTargets = expectedTargets.filter((target) => latestByTarget.get(target) !== "success");
  if (!retryTargets.length) return { warnings: [], retried: 0 };
  return { warnings: await refreshPublicationTargets(operationId, retryTargets), retried: retryTargets.length };
}

export async function publishDueScheduledContent(limit = 50) {
  const now = new Date();
  const due = await getDatabase().select({
    id: postLocalizations.id,
    approvedRevisionNumber: postLocalizations.approvedRevisionNumber,
    scheduledAt: postLocalizations.scheduledAt,
  }).from(postLocalizations)
    .where(and(eq(postLocalizations.status, "scheduled"), lte(postLocalizations.scheduledAt, now)))
    .orderBy(asc(postLocalizations.scheduledAt)).limit(limit);
  const outcomes = [];
  let overdueCount = 0;
  let maxOverdueMs = 0;
  for (const item of due) {
    if (item.scheduledAt) {
      const overdueMs = now.getTime() - item.scheduledAt.getTime();
      if (overdueMs > scheduledDelayGraceMs()) {
        overdueCount += 1;
        maxOverdueMs = Math.max(maxOverdueMs, overdueMs);
      }
    }
    const digest = createHash("sha256").update(`scheduled:${item.id}:${item.approvedRevisionNumber}`).digest("hex");
    const key = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    const transition = await transitionPublication(item.id, { action: "publish", idempotencyKey: key }, null);
    const result = transition.result as { item: { locale: string; slug: string } };
    const warnings = transition.replayed ? [] : await refreshPublication(transition.operationId, result.item.locale, result.item.slug);
    outcomes.push({ id: item.id, published: true, replayed: transition.replayed, warnings });
  }
  if (due.length) {
    if (overdueCount) reportAdminFailure(adminEvents.scheduledDelay, { overdueCount, maxOverdueMs, processed: due.length });
    else reportAdminSuccess(adminEvents.scheduledDelay, { processed: due.length });
  }
  return outcomes;
}
