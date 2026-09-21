import type { ContentDeletionCode } from "./errors";
import type { AdminRole } from "./permissions";

export type DeletionScope = "localization" | "post";

export type DeletionActor = { role: AdminRole; userId: string };

export type DeletableLocalization = {
  id: string;
  status: string;
  createdById: string | null;
};

export type DeletionDecision =
  | { allowed: true }
  | { allowed: false; code: ContentDeletionCode; message: string };

export const deletionMessages = {
  published:
    "Published content must be archived or unpublished before it can be deleted.",
  mixedPublished:
    "This post still has published content. Archive or unpublish every localization first.",
  archived: "Only an administrator can delete once-published (archived) content.",
  ownership: "Editors can only delete never-published drafts they created.",
  empty: "This post has no localizations to delete.",
} as const;

function denied(code: ContentDeletionCode, message: string): DeletionDecision {
  return { allowed: false, code, message };
}

/**
 * Ownership and state rules for permanent deletion. Pure so it stays
 * unit-testable and so the same decision is used by the server enforcement
 * path and the workspace affordance.
 *
 * Never-published drafts (draft, review, scheduled) are deletable by their
 * creator or by a reviewer/administrator. Once-published (archived) content is
 * administrator-only. Published content is never deletable in one step.
 */
export function canDeleteLocalization(
  actor: DeletionActor,
  item: DeletableLocalization,
): DeletionDecision {
  if (item.status === "published") {
    return denied("published_requires_archive", deletionMessages.published);
  }
  if (item.status === "archived") {
    return actor.role === "admin" ? { allowed: true } : denied("forbidden", deletionMessages.archived);
  }
  if (actor.role === "editor" && item.createdById !== actor.userId) {
    return denied("forbidden", deletionMessages.ownership);
  }
  return { allowed: true };
}

/** Whole-post deletion requires every localization to be deletable. */
export function canDeletePost(
  actor: DeletionActor,
  items: DeletableLocalization[],
): DeletionDecision {
  if (items.length === 0) {
    return denied("forbidden", deletionMessages.empty);
  }
  if (items.some((item) => item.status === "published")) {
    return denied("published_requires_archive", deletionMessages.mixedPublished);
  }
  if (items.some((item) => item.status === "archived") && actor.role !== "admin") {
    return denied("forbidden", deletionMessages.archived);
  }
  if (
    actor.role === "editor"
    && items.some((item) => item.createdById !== actor.userId)
  ) {
    return denied("forbidden", deletionMessages.ownership);
  }
  return { allowed: true };
}
