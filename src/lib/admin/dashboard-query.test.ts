import assert from "node:assert/strict";
import test from "node:test";
import {
  dashboardFilterKey,
  dashboardQuerySchema,
  decodeDashboardCursor,
  encodeDashboardCursor,
} from "./dashboard-query";

test("dashboard query defaults to all articles ordered by newest update", () => {
  const query = dashboardQuerySchema.parse({});
  assert.equal(query.view, "all");
  assert.equal(query.sort, "updated");
  assert.equal(query.order, "desc");
});

test("dashboard cursors are bound to the active filters and user view", () => {
  const query = dashboardQuerySchema.parse({ view: "mine", locale: "fa", sort: "title", order: "asc" });
  const filterKey = dashboardFilterKey(query, "00000000-0000-4000-8000-000000000001");
  const encoded = encodeDashboardCursor({
    version: 1,
    direction: "next",
    sort: "title",
    order: "asc",
    value: "A title",
    id: "00000000-0000-4000-8000-000000000002",
    page: 2,
    filterKey,
  });

  assert.equal(decodeDashboardCursor(encoded, filterKey, { sort: "title", order: "asc" })?.page, 2);
  assert.equal(decodeDashboardCursor(encoded, filterKey, { sort: "updated", order: "desc" }), undefined);
  assert.equal(decodeDashboardCursor(encoded, dashboardFilterKey(query, "00000000-0000-4000-8000-000000000003")), undefined);
});

test("malformed dashboard cursors fail closed without breaking the view", () => {
  assert.equal(decodeDashboardCursor("not-a-cursor", "filters"), undefined);
});
