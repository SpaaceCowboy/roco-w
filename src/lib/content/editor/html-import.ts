import type { JSONContent } from "@tiptap/core";
import { editorExtensions } from "./extensions";

const MAX_IMPORT_BYTES = 400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TEXT_ALIGN = new Set(["left", "right", "center", "justify"]);
const DROP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "link", "meta", "noscript", "svg", "math"]);
const DROP_SELECTOR = [...DROP_TAGS].join(", ");

const emptyEditorDocument: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type GenerateJson = (html: string, extensions: typeof editorExtensions) => JSONContent;

export type HtmlImportResult = {
  document: JSONContent;
  strippedImages: number;
  droppedEmptyBlocks: number;
  warnings: string[];
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function textAlignFromStyle(element: Element): string | null {
  const raw = element.getAttribute("style") ?? "";
  const match = /(?:^|;)\s*text-align\s*:\s*([a-z]+)\s*(?:;|$)/i.exec(raw);
  if (!match) return null;
  const value = match[1].toLowerCase();
  return ALLOWED_TEXT_ALIGN.has(value) ? value : null;
}

function preprocessHtml(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/<meta\b[^>]*>/gi, "");
  }
  const parsed = new DOMParser().parseFromString(html, "text/html");
  for (const element of [...parsed.body.querySelectorAll(DROP_SELECTOR)]) {
    element.remove();
  }
  for (const element of [...parsed.body.querySelectorAll("img")]) {
    const mediaId = element.getAttribute("data-media-id");
    if (!isUuid(mediaId)) element.remove();
  }
  for (const element of [...parsed.body.querySelectorAll<HTMLElement>("*")]) {
    element.removeAttribute("onerror");
    element.removeAttribute("onclick");
    element.removeAttribute("onload");
    element.removeAttribute("onmouseover");
    const align = textAlignFromStyle(element);
    if (align) {
      const style = (element.getAttribute("style") ?? "").replace(/text-align\s*:[^;]+;?/gi, "").trim();
      const next = style ? `${style}; text-align: ${align}` : `text-align: ${align}`;
      element.setAttribute("style", next);
    } else if (element.hasAttribute("style") && element.tagName !== "IMG") {
      const cleaned = (element.getAttribute("style") ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter((part) => /^text-align\s*:\s*(left|right|center|justify)$/i.test(part));
      if (cleaned.length) element.setAttribute("style", cleaned.join("; "));
      else element.removeAttribute("style");
    }
  }
  return parsed.body.innerHTML;
}

function stripInvalidImages(node: JSONContent, counter: { stripped: number }): JSONContent | null {
  if (node.type === "image" && !isUuid(node.attrs?.mediaId)) {
    counter.stripped += 1;
    return null;
  }
  if (!node.content?.length) return node;
  const content: JSONContent[] = [];
  for (const child of node.content) {
    const next = stripInvalidImages(child, counter);
    if (next) content.push(next);
  }
  if (!content.length && node.type !== "doc") return null;
  return { ...node, content };
}

function dropEmptyBlocks(node: JSONContent, counter: { dropped: number }): JSONContent | null {
  if (node.type !== "doc" && !node.content?.length) {
    if (["paragraph", "heading", "blockquote", "listItem", "callout", "codeBlock"].includes(node.type ?? "")) {
      counter.dropped += 1;
      return null;
    }
  }
  if (!node.content?.length) return node;
  const content: JSONContent[] = [];
  for (const child of node.content) {
    const next = dropEmptyBlocks(child, counter);
    if (next) content.push(next);
  }
  if (node.type === "doc") return { ...node, content: content.length ? content : [{ type: "paragraph" }] };
  if (!content.length) {
    counter.dropped += 1;
    return null;
  }
  return { ...node, content };
}

function hasVisibleContent(document: JSONContent): boolean {
  if (document.text?.trim()) return true;
  if (document.type === "image" && isUuid(document.attrs?.mediaId)) return true;
  if (document.type === "horizontalRule" || document.type === "codeBlock") return true;
  return (document.content ?? []).some(hasVisibleContent);
}

export function sanitizeImportableHtml(rawHtml: string): { html: string; strippedImages: number; warnings: string[] } {
  if (typeof DOMParser === "undefined") {
    const withoutScripts = rawHtml
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, (match, _quoted: string, offset: number, full: string) => {
        const before = full.slice(Math.max(0, offset - 80), offset);
        if (!/<[a-z][^>]*$/i.test(before)) return match;
        const styleMatch = /text-align\s*:\s*(left|right|center|justify)/i.exec(match);
        return styleMatch ? ` style="text-align: ${styleMatch[1].toLowerCase()}"` : "";
      });
    const imgPattern = /<img\b[^>]*>/gi;
    let strippedImages = 0;
    const html = withoutScripts.replace(imgPattern, (tag) => {
      const mediaId = /data-media-id\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (isUuid(mediaId)) return tag;
      strippedImages += 1;
      return "";
    });
    const warnings = strippedImages
      ? [`Removed ${strippedImages} pasted image${strippedImages === 1 ? "" : "s"} without an uploaded media ID.`]
      : [];
    return { html, strippedImages, warnings };
  }
  const parsed = new DOMParser().parseFromString(rawHtml, "text/html");
  for (const element of [...parsed.body.querySelectorAll(DROP_SELECTOR)]) element.remove();
  let strippedImages = 0;
  for (const element of [...parsed.body.querySelectorAll("img")]) {
    const mediaId = element.getAttribute("data-media-id");
    if (!isUuid(mediaId)) { strippedImages += 1; element.remove(); }
  }
  for (const element of [...parsed.body.querySelectorAll<HTMLElement>("*")]) {
    for (const name of ["onerror", "onclick", "onload", "onmouseover"] as const) element.removeAttribute(name);
    const align = textAlignFromStyle(element);
    if (align) element.setAttribute("style", `text-align: ${align}`);
    else if (element.hasAttribute("style")) element.removeAttribute("style");
  }
  const warnings = strippedImages
    ? [`Removed ${strippedImages} pasted image${strippedImages === 1 ? "" : "s"} without an uploaded media ID.`]
    : [];
  return { html: parsed.body.innerHTML, strippedImages, warnings };
}

export function importHtmlToDocument(rawHtml: string, generateJSON: GenerateJson): HtmlImportResult {
  const html = rawHtml.trim();
  if (!html) {
    return { document: emptyEditorDocument, strippedImages: 0, droppedEmptyBlocks: 0, warnings: [] };
  }
  const byteLength = typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(html).byteLength
    : html.length;
  if (byteLength > MAX_IMPORT_BYTES) {
    throw new Error("HTML import is too large (max 400 KB)");
  }

  const preprocessed = preprocessHtml(html);
  let document: JSONContent;
  try {
    document = generateJSON(preprocessed, editorExtensions);
  } catch {
    throw new Error("Could not parse HTML into the article editor");
  }

  if (!document || document.type !== "doc") {
    throw new Error("Could not parse HTML into the article editor");
  }

  const imageCounter = { stripped: 0 };
  const afterImages = stripInvalidImages(document, imageCounter) ?? emptyEditorDocument;
  const emptyCounter = { dropped: 0 };
  const afterEmpty = dropEmptyBlocks(afterImages, emptyCounter) ?? emptyEditorDocument;
  const finalDocument = hasVisibleContent(afterEmpty) ? afterEmpty : emptyEditorDocument;

  const warnings: string[] = [];
  if (imageCounter.stripped) {
    warnings.push(`Removed ${imageCounter.stripped} image${imageCounter.stripped === 1 ? "" : "s"} without an uploaded media ID — re-insert them from the media panel.`);
  }
  if (emptyCounter.dropped) {
    warnings.push(`Removed ${emptyCounter.dropped} empty block${emptyCounter.dropped === 1 ? "" : "s"}.`);
  }
  if (!hasVisibleContent(finalDocument)) {
    warnings.push("No supported article content was found in the HTML.");
  }

  return {
    document: finalDocument,
    strippedImages: imageCounter.stripped,
    droppedEmptyBlocks: emptyCounter.dropped,
    warnings,
  };
}
