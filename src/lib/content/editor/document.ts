import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { editorExtensions } from "./extensions";

export const emptyEditorDocument: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const allowedNodeTypes = new Set([
  "doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem",
  "blockquote", "codeBlock", "hardBreak", "horizontalRule", "image", "table", "tableRow",
  "tableHeader", "tableCell", "callout",
]);
const allowedMarkTypes = new Set(["bold", "italic", "strike", "code", "link"]);
const MAX_DOCUMENT_BYTES = 750_000;
const MAX_DOCUMENT_NODES = 10_000;
const MAX_DOCUMENT_DEPTH = 40;

export const editorDocumentSchema = z.custom<JSONContent>((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if ((value as JSONContent).type !== "doc") return false;
  return Buffer.byteLength(JSON.stringify(value), "utf8") <= MAX_DOCUMENT_BYTES;
}, "Invalid or oversized editor document");

export type EditorDocumentInspection = {
  media: Array<{ mediaId: string; alt: string }>;
  textLength: number;
};

export function inspectEditorDocument(document: JSONContent): EditorDocumentInspection {
  let nodeCount = 0;
  let textLength = 0;
  const media = new Map<string, string>();

  function visit(node: JSONContent, depth: number): void {
    nodeCount += 1;
    if (nodeCount > MAX_DOCUMENT_NODES || depth > MAX_DOCUMENT_DEPTH) {
      throw new Error("Editor document is too complex");
    }
    if (!node.type || !allowedNodeTypes.has(node.type)) throw new Error(`Unsupported editor node: ${node.type ?? "unknown"}`);
    for (const mark of node.marks ?? []) {
      if (!mark.type || !allowedMarkTypes.has(mark.type)) throw new Error(`Unsupported editor mark: ${mark.type ?? "unknown"}`);
    }
    if (node.type === "heading" && ![2, 3, 4].includes(Number(node.attrs?.level))) {
      throw new Error("Only heading levels 2 through 4 are allowed");
    }
    if (node.type === "heading" && node.attrs?.id && !/^[\p{L}\p{N}_-]{1,200}$/u.test(String(node.attrs.id))) {
      throw new Error("Heading ID contains unsupported characters");
    }
    if (node.type === "callout" && !["note", "warning"].includes(String(node.attrs?.tone))) {
      throw new Error("Unsupported callout tone");
    }
    if (node.type === "image") {
      const mediaId = String(node.attrs?.mediaId ?? "");
      const alt = String(node.attrs?.alt ?? "").trim();
      if (!z.string().uuid().safeParse(mediaId).success) throw new Error("Every image must reference an uploaded media item");
      if (!alt || alt.length > 300) throw new Error("Every image needs alt text of at most 300 characters");
      media.set(mediaId, alt);
    }
    if (node.text) textLength += node.text.length;
    for (const child of node.content ?? []) visit(child, depth + 1);
  }

  visit(document, 0);
  return { media: [...media].map(([mediaId, alt]) => ({ mediaId, alt })), textLength };
}

export function renderEditorDocument(document: JSONContent): { html: string; inspection: EditorDocumentInspection } {
  const parsed = editorDocumentSchema.parse(document);
  const inspection = inspectEditorDocument(parsed);
  const generated = generateHTML(parsed, editorExtensions);
  const html = sanitizeHtml(generated, {
    allowedTags: [
      "p", "br", "strong", "em", "s", "code", "pre", "h2", "h3", "h4", "ul", "ol", "li",
      "blockquote", "hr", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "aside",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "data-media-id"],
      th: ["colspan", "rowspan", "colwidth"],
      td: ["colspan", "rowspan", "colwidth"],
      aside: ["data-callout", "data-tone", "class"],
      h2: ["id"], h3: ["id"], h4: ["id"],
    },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: { ...attributes, rel: "noopener noreferrer", ...(attributes.target === "_blank" ? { target: "_blank" } : {}) },
      }),
    },
  });
  return { html, inspection };
}

export function normalizeHeadingIds(document: JSONContent): JSONContent {
  const normalized = structuredClone(document);
  const used = new Set<string>();
  const textFor = (node: JSONContent): string => [node.text ?? "", ...(node.content ?? []).map(textFor)].join(" ").replace(/\s+/g, " ").trim();
  const visit = (node: JSONContent) => {
    if (node.type === "heading") {
      const supplied = typeof node.attrs?.id === "string" ? node.attrs.id : "";
      const base = supplied || textFor(node).normalize("NFKC").toLocaleLowerCase("en")
        .replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "section";
      let id = base.slice(0, 180);
      let counter = 2;
      while (used.has(id)) id = `${base.slice(0, 170)}-${counter++}`;
      used.add(id);
      node.attrs = { ...node.attrs, id };
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(normalized);
  return normalized;
}

export function readingMinutesFor(textLength: number): number {
  return Math.max(1, Math.ceil(textLength / 1_000));
}

export function collectPlainText(document: JSONContent): string {
  const parts: string[] = [];
  function visit(node: JSONContent): void {
    if (node.text) parts.push(node.text);
    for (const child of node.content ?? []) visit(child);
  }
  visit(document);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
