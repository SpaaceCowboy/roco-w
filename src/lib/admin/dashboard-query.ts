import { createHash } from "node:crypto";
import { z } from "zod";
import { postListFiltersSchema } from "./content-validation";

export const dashboardViews = ["all", "mine", "review", "scheduled", "recent", "attention"] as const;
export const dashboardSorts = ["updated", "title", "author", "status", "locale"] as const;
export const dashboardOrders = ["asc", "desc"] as const;

export const dashboardQuerySchema = postListFiltersSchema.extend({
  view: z.enum(dashboardViews).default("all"),
  sort: z.enum(dashboardSorts).default("updated"),
  order: z.enum(dashboardOrders).default("desc"),
  cursor: z.string().max(2_000).optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardView = (typeof dashboardViews)[number];
export type DashboardSort = (typeof dashboardSorts)[number];
export type DashboardOrder = (typeof dashboardOrders)[number];

const cursorSchema = z.object({
  version: z.literal(1),
  direction: z.enum(["next", "previous"]),
  sort: z.enum(dashboardSorts),
  order: z.enum(dashboardOrders),
  value: z.string().max(1_000),
  id: z.string().uuid(),
  page: z.number().int().min(1).max(100_000),
  filterKey: z.string().max(2_000),
});

export type DashboardCursor = z.infer<typeof cursorSchema>;

export function dashboardFilterKey(query: DashboardQuery, actorId: string): string {
  const serialized = JSON.stringify({
    locale: query.locale ?? null,
    status: query.status ?? null,
    author: query.author ?? null,
    category: query.category ?? null,
    from: query.from?.toISOString() ?? null,
    to: query.to?.toISOString() ?? null,
    q: query.q ?? null,
    view: query.view,
    sort: query.sort,
    order: query.order,
    actorId: query.view === "mine" ? actorId : null,
  });
  return createHash("sha256").update(serialized).digest("base64url");
}

export function encodeDashboardCursor(cursor: DashboardCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeDashboardCursor(
  value: string | undefined,
  filterKey: string,
  expected?: { sort: DashboardSort; order: DashboardOrder },
): DashboardCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (
      !parsed.success
      || parsed.data.filterKey !== filterKey
      || (expected && (parsed.data.sort !== expected.sort || parsed.data.order !== expected.order))
    ) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
}
