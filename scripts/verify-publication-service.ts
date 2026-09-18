import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/db/client";
import { adminUsers, postLocalizations, postRevisions, posts } from "../src/db/schema";
import { PublicationTransitionError, transitionPublication } from "../src/lib/admin/publication-service";

async function main() {
const db = getDatabase();
const suffix = crypto.randomUUID();
const [admin] = await db.insert(adminUsers).values({
  email: `${suffix}@example.test`,
  normalizedEmail: `${suffix}@example.test`,
  displayName: "Publication verifier",
  role: "admin",
}).returning();
const [post] = await db.insert(posts).values({ defaultLocale: "en", createdById: admin.id }).returning();
const [localization] = await db.insert(postLocalizations).values({
  postId: post.id,
  locale: "en",
  slug: `publication-verification-${suffix}`,
  title: "Publication verification",
  excerpt: "",
  authorName: "Editorial",
  editorDocument: { type: "doc", content: [{ type: "paragraph" }] },
  renderedHtml: "<p></p>",
}).returning();
await db.insert(postRevisions).values({
  localizationId: localization.id,
  revisionNumber: 1,
  title: localization.title,
  slug: localization.slug,
  excerpt: "",
  editorDocument: localization.editorDocument,
  renderedHtml: localization.renderedHtml,
  createdById: admin.id,
});

const session = { userId: admin.id, role: "admin" as const, expiresAt: new Date(Date.now() + 60_000) };
const reviewKey = crypto.randomUUID();
const review = await transitionPublication(localization.id, { action: "request_review", idempotencyKey: reviewKey }, session);
assert.equal((review.result as { item: { status: string } }).item.status, "review");
const replay = await transitionPublication(localization.id, { action: "request_review", idempotencyKey: reviewKey }, session);
assert.equal(replay.replayed, true);
assert.equal(replay.operationId, review.operationId);

const concurrentPublishes = await Promise.allSettled([
  transitionPublication(localization.id, { action: "publish", idempotencyKey: crypto.randomUUID() }, session),
  transitionPublication(localization.id, { action: "publish", idempotencyKey: crypto.randomUUID() }, session),
]);
assert.equal(concurrentPublishes.filter((result) => result.status === "fulfilled").length, 1);
assert.equal(concurrentPublishes.filter((result) => result.status === "rejected").length, 1);
const published = concurrentPublishes.find((result) => result.status === "fulfilled")!.value;
assert.equal((published.result as { item: { status: string } }).item.status, "published");
assert.equal((published.result as { item: { publishedRevisionNumber: number } }).item.publishedRevisionNumber, 1);
await transitionPublication(localization.id, { action: "archive", idempotencyKey: crypto.randomUUID() }, session);
await transitionPublication(localization.id, { action: "restore", idempotencyKey: crypto.randomUUID() }, session);
await transitionPublication(localization.id, { action: "unpublish", idempotencyKey: crypto.randomUUID() }, session);

const [draft] = await db.select().from(postLocalizations).where(eq(postLocalizations.id, localization.id));
assert.equal(draft.status, "draft");
assert.equal(draft.publishedRevisionNumber, null);
assert.equal(draft.approvedRevisionNumber, null);
await assert.rejects(
  transitionPublication(localization.id, { action: "publish", idempotencyKey: crypto.randomUUID() }, session),
  (error) => error instanceof PublicationTransitionError && error.code === "invalid_transition",
);
await transitionPublication(localization.id, { action: "request_review", idempotencyKey: crypto.randomUUID() }, session);
await transitionPublication(localization.id, {
  action: "schedule",
  idempotencyKey: crypto.randomUUID(),
  scheduledAt: new Date(Date.now() + 60_000).toISOString(),
}, session);
await db.update(postLocalizations).set({ scheduledAt: new Date(Date.now() - 1_000) })
  .where(eq(postLocalizations.id, localization.id));
const systemPublished = await transitionPublication(
  localization.id,
  { action: "publish", idempotencyKey: crypto.randomUUID() },
  null,
);
assert.equal((systemPublished.result as { item: { status: string } }).item.status, "published");

console.log("Publication workflow and idempotency checks passed");
await closeDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabase();
  process.exitCode = 1;
});
