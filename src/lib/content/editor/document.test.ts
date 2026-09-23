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

test("strips non-https image sources", () => {
  const result = renderEditorDocument({
    type: "doc",
    content: [{
      type: "image",
      attrs: { mediaId: "00000000-0000-4000-8000-000000000000", alt: "diagram", src: "http://evil.example.com/a.png" },
    }],
  });
  assert.doesNotMatch(result.html, /evil\.example\.com/i);
  assert.doesNotMatch(result.html, /http:\/\//i);
});

test("strips javascript, data, and vbscript link schemes", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)"]) {
    const result = renderEditorDocument({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href } }] }] }],
    });
    assert.doesNotMatch(result.html, /(javascript|vbscript|data:text\/html):/i);
  }
});

test("drops event-handler attributes from links and hardens target", () => {
  const result = renderEditorDocument({
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "https://rocobroker.com", onclick: "alert(1)", target: "_blank" } }] }],
    }],
  });
  assert.doesNotMatch(result.html, /onclick/i);
  assert.match(result.html, /rel="noopener noreferrer"/);
});

test("escapes script-like text so it cannot execute", () => {
  const result = renderEditorDocument({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "</p><script>alert(1)</script>" }] }],
  });
  assert.doesNotMatch(result.html, /<script/i);
});

test("keeps allowed text-align styles and drops other inline styles", () => {
  const kept = renderEditorDocument({
    type: "doc",
    content: [{ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "aligned" }] }],
  });
  assert.match(kept.html, /text-align:\s*center/i);

  const generated = renderEditorDocument({
    type: "doc",
    content: [{ type: "paragraph", attrs: { textAlign: "left" }, content: [{ type: "text", text: "left" }] }],
  });
  assert.doesNotMatch(generated.html, /expression\(/i);
});

test("rejects unsupported text alignment values", () => {
  assert.throws(
    () => renderEditorDocument({
      type: "doc",
      content: [{ type: "paragraph", attrs: { textAlign: "evil" }, content: [{ type: "text", text: "x" }] }],
    }),
    /Unsupported text alignment/,
  );
});
