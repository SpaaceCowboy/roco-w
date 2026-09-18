import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/db/client";
import { adminUsers, postLocalizations, postSlugHistory } from "../src/db/schema";
import { ContentRouteConflictError, createAdminPost, saveAdminDraft } from "../src/lib/admin/content-service";
import { transitionPublication } from "../src/lib/admin/publication-service";
import { getPublishedArticleSeo } from "../src/lib/content/published-seo";
import { databasePublishedContentRepository } from "../src/lib/content/databaseRepository";

async function main() {
  const suffix = crypto.randomUUID().slice(0, 8);
  const db = getDatabase();
  const [admin] = await db.insert(adminUsers).values({
    email: `seo-${suffix}@example.test`, normalizedEmail: `seo-${suffix}@example.test`,
    displayName: "SEO verifier", role: "admin",
  }).returning();
  const session = { userId: admin.id, role: "admin" as const, expiresAt: new Date(Date.now() + 60_000) };
  const item = await createAdminPost({ locale: "en", title: `SEO verification ${suffix}`, authorName: "Editorial" }, session);
  const document = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] }, { type: "paragraph", content: [{ type: "text", text: "Body" }] }] };
  const seo = {
    title: `SEO title ${suffix}`, description: "A focused metadata description.",
    canonicalOverride: null, noIndex: false, noFollow: false,
    socialTitle: "Social title", socialDescription: "Social description",
    featuredMediaId: null, featuredImageAlt: "", socialMediaId: null,
  };
  const firstSlug = `first-${suffix}`;
  const secondSlug = `second-${suffix}`;
  const firstSave = await saveAdminDraft(item.id, {
    version: item.version, title: item.title, slug: firstSlug, excerpt: "Excerpt",
    authorName: item.authorName, document, seo,
  }, session);
  const secondSave = await saveAdminDraft(item.id, {
    version: firstSave.item.version, title: item.title, slug: secondSlug, excerpt: "Excerpt",
    authorName: item.authorName, document, seo,
  }, session);
  const history = await db.select().from(postSlugHistory).where(eq(postSlugHistory.localizationId, item.id));
  assert.ok(history.some((route) => route.oldSlug === firstSlug));
  await assert.rejects(
    saveAdminDraft(item.id, {
      version: secondSave.item.version, title: item.title, slug: firstSlug, excerpt: "Excerpt",
      authorName: item.authorName, document, seo,
    }, session),
    (error) => error instanceof ContentRouteConflictError,
  );

  await transitionPublication(item.id, { action: "request_review", idempotencyKey: crypto.randomUUID() }, session);
  await transitionPublication(item.id, { action: "publish", idempotencyKey: crypto.randomUUID() }, session);
  const published = await getPublishedArticleSeo("en", secondSlug);
  assert.ok(published);
  assert.equal(published.title, seo.title);
  assert.equal(published.canonical, `https://rocobroker.com/${secondSlug}`);
  assert.deepEqual(Object.keys(published.languages), ["en", "x-default"]);
  const publicPost = await databasePublishedContentRepository.findPost("en", secondSlug);
  assert.ok(publicPost);
  assert.equal(publicPost.title, item.title);
  assert.equal(publicPost.slug, secondSlug);
  assert.equal((await databasePublishedContentRepository.listIndexablePosts("en")).some((post) => post.slug === secondSlug), true);

  const [stored] = await db.select().from(postLocalizations).where(and(eq(postLocalizations.id, item.id), eq(postLocalizations.status, "published")));
  assert.ok(stored.publishedRevisionNumber);
  console.log("SEO revision, metadata, and slug-history checks passed");
  await closeDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabase();
  process.exitCode = 1;
});
