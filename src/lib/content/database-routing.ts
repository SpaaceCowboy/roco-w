import "server-only";

import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { postLocalizations, postRevisions, postSlugHistory } from "@/db/schema";
import { publishedArticlePath } from "@/config/blog-routing";

export async function findPublishedSlugRedirect(locale: string, oldSlug: string): Promise<string | null> {
  const [route] = await getDatabase().select({ slug: postRevisions.slug })
    .from(postSlugHistory)
    .innerJoin(postLocalizations, eq(postLocalizations.id, postSlugHistory.localizationId))
    .innerJoin(postRevisions, and(
      eq(postRevisions.localizationId, postLocalizations.id),
      eq(postRevisions.revisionNumber, postLocalizations.publishedRevisionNumber),
    ))
    .where(and(
      eq(postSlugHistory.locale, locale as typeof postSlugHistory.$inferSelect.locale),
      eq(postSlugHistory.oldSlug, oldSlug),
      eq(postLocalizations.status, "published"),
    )).limit(1);
  if (!route || route.slug === oldSlug) return null;
  return publishedArticlePath(locale, route.slug);
}
