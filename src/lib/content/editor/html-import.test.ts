import assert from "node:assert/strict";
import test from "node:test";
import { generateJSON } from "@tiptap/html/server";
import { collectPlainText, renderEditorDocument } from "./document";
import { importHtmlToDocument, sanitizeImportableHtml } from "./html-import";

test("imports headings, paragraphs, and text alignment", () => {
  const result = importHtmlToDocument(
    `<h2>Title</h2><p style="text-align:center">Centered</p><p><strong>Bold</strong> and <em>italic</em></p>`,
    generateJSON,
  );
  const text = collectPlainText(result.document);
  assert.match(text, /Title/);
  assert.match(text, /Centered/);
  assert.match(text, /Bold/);
  const html = renderEditorDocument(result.document).html;
  assert.match(html, /<h2/);
  assert.match(html, /text-align:\s*center/i);
});

test("strips scripts and external images on import", () => {
  const result = importHtmlToDocument(
    `<script>alert(1)</script><p>Keep me</p><img src="https://evil.example/a.png" alt="x">`,
    generateJSON,
  );
  assert.equal(result.strippedImages, 1);
  assert.ok(result.warnings.some((warning) => warning.includes("image")));
  const text = collectPlainText(result.document);
  assert.match(text, /Keep me/);
  assert.doesNotMatch(text, /alert/);
  const html = renderEditorDocument(result.document).html;
  assert.doesNotMatch(html, /evil\.example/i);
  assert.doesNotMatch(html, /<script/i);
});

test("keeps images that already reference uploaded media", () => {
  const mediaId = "00000000-0000-4000-8000-000000000000";
  const result = importHtmlToDocument(
    `<p>Before</p><img data-media-id="${mediaId}" src="https://cdn.example/a.png" alt="chart">`,
    generateJSON,
  );
  assert.equal(result.strippedImages, 0);
  const html = renderEditorDocument(result.document).html;
  assert.match(html, new RegExp(mediaId));
});

test("empty html returns the empty document", () => {
  const result = importHtmlToDocument("   ", generateJSON);
  assert.deepEqual(result.document, { type: "doc", content: [{ type: "paragraph" }] });
  assert.equal(result.warnings.length, 0);
});

test("sanitizeImportableHtml strips scripts and untracked images for paste", () => {
  const sanitized = sanitizeImportableHtml(
    `<p onclick="alert(1)" style="color:red">Hi</p><img src="https://evil.example/a.png"><script>x</script>`,
  );
  assert.doesNotMatch(sanitized.html, /<script/i);
  assert.doesNotMatch(sanitized.html, /evil\.example/i);
  assert.doesNotMatch(sanitized.html, /onclick/i);
  assert.doesNotMatch(sanitized.html, /color:\s*red/i);
  assert.equal(sanitized.strippedImages, 1);
});

test("rejects unsupported alignment values at render", () => {
  assert.throws(
    () => renderEditorDocument({
      type: "doc",
      content: [{ type: "paragraph", attrs: { textAlign: "javascript:alert(1)" }, content: [{ type: "text", text: "x" }] }],
    }),
    /Unsupported text alignment/,
  );
});
