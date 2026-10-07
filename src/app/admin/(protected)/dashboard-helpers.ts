import { publishedArticlePath } from "@/config/blog-routing";
import { contentLocales } from "@/lib/admin/content-locales";
import type { DashboardView } from "@/lib/admin/dashboard-query";
import { hasAdminPermission, type AdminRole } from "@/lib/admin/permissions";
import type { PublicationAction } from "@/lib/admin/publication-policy";

export type Search = Record<string, string | string[] | undefined>;

export const viewLabels: Record<DashboardView, { label: string; description: string }> = {
  all: { label: "All articles", description: "Every localization" },
  mine: { label: "My drafts", description: "Drafts you created" },
  review: { label: "Awaiting review", description: "Ready for a decision" },
  scheduled: { label: "Scheduled soon", description: "Due in the next 7 days" },
  recent: { label: "Recently published", description: "Published in the last 30 days" },
  attention: { label: "Needs attention", description: "Scheduled time has passed" },
  untranslated: { label: "Missing translations", description: "Fewer than six locales" },
};

/** The single most useful next transition for a row, or null when none applies. */
export function quickAction(role: AdminRole, status: string): { action: PublicationAction; label: string } | null {
  if (status === "draft" && hasAdminPermission(role, "content:write")) return { action: "request_review", label: "Request review" };
  if (status === "review" && hasAdminPermission(role, "content:publish")) return { action: "publish", label: "Publish" };
  if (status === "published" && hasAdminPermission(role, "content:archive")) return { action: "archive", label: "Archive" };
  return null;
}

export const localeLabels: Record<(typeof contentLocales)[number], string> = {
  en: "English",
  fa: "Persian",
  de: "German",
  ru: "Russian",
  ar: "Arabic",
  "zh-hans": "Simplified Chinese",
};

export const statusLabels: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

function scalarParams(raw: Search): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const scalar = one(value);
    if (scalar) params.set(key, scalar);
  }
  return params;
}

export function dashboardHref(raw: Search, changes: Record<string, string | undefined>, resetCursor = true): string {
  const params = scalarParams(raw);
  if (resetCursor) params.delete("cursor");
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export function viewHref(view: DashboardView): string {
  return view === "all" ? "/admin" : `/admin?view=${view}`;
}

/** Public path for display: percent-encoded Persian/Arabic slugs decoded so editors can read them. */
export function displayPath(locale: string, slug: string): string {
  const path = publishedArticlePath(locale, slug);
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** Row checkboxes associate with this (empty) form so server-rendered rows need no client wrapper. */
export const BULK_FORM_ID = "bulk-actions";
