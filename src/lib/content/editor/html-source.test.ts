import assert from "node:assert/strict";
import test from "node:test";
import { generateHTML, generateJSON } from "@tiptap/html/server";
import { editorExtensions } from "./extensions";
import { importHtmlToDocument } from "./html-import";
import { formatHtmlSource } from "./html-source";

test("formats block boundaries while preserving inline spacing and quoted attributes", () => {
  const paragraph = '<p>Read <a href="/blog" title="a > b">the blog</a>, <strong>bold</strong><em>italic</em> &amp; متن فارسی.</p>';
  assert.equal(formatHtmlSource(`<h2>Title</h2>${paragraph}<p>Next</p>`), `<h2>Title</h2>\n${paragraph}\n<p>Next</p>`);
});

test("indents lists and tables without changing the imported editor document", () => {
  const original = importHtmlToDocument('<ul><li><p>First <strong>item</strong>.</p><ul><li><p>Nested</p></li></ul></li></ul><table><tbody><tr><th>Header</th><td>Cell</td></tr></tbody></table>', generateJSON).document;
  const html = generateHTML(original, editorExtensions);
  const formatted = formatHtmlSource(html);

  assert.match(formatted, /<ul>\n  <li>\n    <p>/);
  assert.match(formatted, /<table[^>]*>\n  <colgroup>/);
  assert.match(formatted, /<tbody>\n    <tr>/);
  assert.deepEqual(importHtmlToDocument(formatted, generateJSON).document, original);
  assert.equal(formatHtmlSource(formatted), formatted);
});

test("preserves preformatted code exactly and keeps it unchanged on import", () => {
  const pre = '<pre><code>  const x = &lt;p&gt;;\n\n    return x;\n</code></pre>';
  const html = `<p>Before</p>${pre}<p>After</p>`;
  const formatted = formatHtmlSource(html);
  assert.equal(formatted, `<p>Before</p>\n${pre}\n<p>After</p>`);
  assert.deepEqual(importHtmlToDocument(formatted, generateJSON).document, importHtmlToDocument(html, generateJSON).document);
});

test("preserves adjacent CTA links and their editable attributes", () => {
  const html = '<section data-article-cta="true"><div class="article-cta__copy"><h2 class="article-cta__title">Trade now</h2><p class="article-cta__body">Choose an account.</p></div><div class="article-cta__actions"><a class="article-cta__button article-cta__button--primary" href="/accounts">Accounts</a><a class="article-cta__button article-cta__button--secondary" href="/contact">Contact</a></div></section>';
  const formatted = formatHtmlSource(html);
  assert.ok(formatted.includes('Accounts</a><a'));
  assert.deepEqual(importHtmlToDocument(formatted, generateJSON).document, importHtmlToDocument(html, generateJSON).document);
});
