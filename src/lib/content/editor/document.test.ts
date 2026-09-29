import assert from "node:assert/strict";
import test from "node:test";
import { collectInlineMedia, collectPlainText, emptyEditorDocument, renderEditorDocument } from "./document";

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

test("preserves an inline image's media reference and editable metadata", () => {
  const document = {
    type: "doc",
    content: [{
      type: "image",
      attrs: {
        mediaId: "00000000-0000-4000-8000-000000000000",
        src: "https://media.example.com/content/chart.webp",
        alt: "EUR/USD price chart",
        title: "Weekly market chart",
        width: 1280,
        height: 720,
      },
    }],
  };
  const result = renderEditorDocument(document);

  assert.match(result.html, /data-media-id="00000000-0000-4000-8000-000000000000"/);
  assert.match(result.html, /src="https:\/\/media\.example\.com\/content\/chart\.webp"/);
  assert.match(result.html, /alt="EUR\/USD price chart"/);
  assert.match(result.html, /title="Weekly market chart"/);
  assert.match(result.html, /width="1280"/);
  assert.match(result.html, /height="720"/);
  assert.deepEqual(collectInlineMedia(document), [{
    mediaId: "00000000-0000-4000-8000-000000000000",
    src: "https://media.example.com/content/chart.webp",
    alt: "EUR/USD price chart",
    title: "Weekly market chart",
    width: 1280,
    height: 720,
  }]);
});

test("rejects oversized inline image titles", () => {
  assert.throws(
    () => renderEditorDocument({
      type: "doc",
      content: [{
        type: "image",
        attrs: {
          mediaId: "00000000-0000-4000-8000-000000000000",
          src: "https://media.example.com/a.webp",
          alt: "Chart",
          title: "x".repeat(301),
        },
      }],
    }),
    /Image titles must be at most 300 characters/,
  );
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

test("renders a validated two-button article CTA", () => {
  const document = {
    type: "doc",
    content: [{
      type: "articleCta",
      attrs: {
        heading: "Ready to trade?",
        body: "Open an account in a few steps.",
        primaryLabel: "Open account",
        primaryHref: "/en/accounts",
        secondaryLabel: "Contact us",
        secondaryHref: "https://rocobroker.com/en/contact",
      },
    }],
  };
  const result = renderEditorDocument(document);

  assert.match(result.html, /data-article-cta="true"/);
  assert.match(result.html, /href="\/en\/accounts"/);
  assert.match(result.html, /article-cta__button--secondary/);
  assert.match(collectPlainText(document), /Ready to trade\?/);
});

test("rejects unsafe CTA links", () => {
  for (const unsafeHref of ["javascript:alert(1)", "//evil.example/path"]) {
    assert.throws(
      () => renderEditorDocument({
        type: "doc",
        content: [{
          type: "articleCta",
          attrs: {
            heading: "Ready?",
            body: "Start here.",
            primaryLabel: "Open",
            primaryHref: unsafeHref,
            secondaryLabel: "Contact",
            secondaryHref: "/contact",
          },
        }],
      }),
      /CTA links must be internal paths/,
    );
  }
});
