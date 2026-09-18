import assert from "node:assert/strict";
import test from "node:test";
import { emptyEditorDocument, renderEditorDocument } from "./document";

test("renders the empty document", () => {
  assert.equal(renderEditorDocument(emptyEditorDocument).html, "<p></p>");
});

test("sanitizes unsafe links", () => {
  const result = renderEditorDocument({
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
    }],
  });
  assert.doesNotMatch(result.html, /javascript:/i);
});

test("rejects arbitrary nodes", () => {
  assert.throws(() => renderEditorDocument({ type: "doc", content: [{ type: "script" }] }), /Unsupported editor node/);
});

test("requires uploaded media ids and alt text", () => {
  assert.throws(
    () => renderEditorDocument({ type: "doc", content: [{ type: "image", attrs: { src: "https://example.com/a.png" } }] }),
    /uploaded media item/,
  );
});
