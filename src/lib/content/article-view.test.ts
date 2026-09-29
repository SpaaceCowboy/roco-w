import assert from "node:assert/strict";
import test from "node:test";
import { stableArticleSeed, tableOfContentsForDocument } from "./article-view";

test("builds the public table of contents from normalized editor headings", () => {
  const tableOfContents = tableOfContentsForDocument({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Introduction" }] },
      { type: "heading", attrs: { level: 2, id: "market-hours" }, content: [{ type: "text", text: "Market hours" }] },
      { type: "heading", attrs: { level: 3, id: "london-session" }, content: [{ type: "text", text: "London " }, { type: "text", text: "session" }] },
      { type: "heading", attrs: { level: 4, id: "overlap" }, content: [{ type: "text", text: "Session overlap" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Unsaved heading" }] },
    ],
  });

  assert.deepEqual(tableOfContents, [
    { level: 2, id: "market-hours", label: "Market hours" },
    { level: 3, id: "london-session", label: "London session" },
    { level: 4, id: "overlap", label: "Session overlap" },
  ]);
});

test("uses a stable non-zero visual seed for articles without a legacy source id", () => {
  assert.equal(stableArticleSeed("article-id"), stableArticleSeed("article-id"));
  assert.notEqual(stableArticleSeed("article-id"), stableArticleSeed("other-article"));
  assert.ok(stableArticleSeed("") > 0);
});
