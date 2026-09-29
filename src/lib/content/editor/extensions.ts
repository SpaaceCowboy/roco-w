import { Extension, Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Heading from "@tiptap/extension-heading";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

const allowedTextAlign = new Set(["left", "right", "center", "justify"]);

export const TextAlignment = Extension.create({
  name: "textAlignment",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              const fromStyle = element.style?.textAlign?.toLowerCase();
              if (fromStyle && allowedTextAlign.has(fromStyle)) return fromStyle;
              const fromAttr = element.getAttribute("text-align")?.toLowerCase();
              if (fromAttr && allowedTextAlign.has(fromAttr)) return fromAttr;
              return null;
            },
            renderHTML: (attributes) => {
              const value = String(attributes.textAlign ?? "");
              if (!allowedTextAlign.has(value)) return {};
              return { style: `text-align: ${value}` };
            },
          },
        },
      },
    ];
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-tone") ?? "note",
        renderHTML: (attributes) => ({ "data-tone": attributes.tone }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { "data-callout": "true", class: "article-callout" }),
      0,
    ];
  },
});

function ctaText(element: Element, selector: string): string {
  return element.querySelector(selector)?.textContent?.trim() ?? "";
}

function ctaHref(element: Element, selector: string): string {
  return element.querySelector(selector)?.getAttribute("href")?.trim() ?? "";
}

export const ArticleCta = Node.create({
  name: "articleCta",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      heading: {
        default: "Ready to start trading?",
        parseHTML: (element) => ctaText(element, ".article-cta__title"),
        renderHTML: () => ({}),
      },
      body: {
        default: "Open an account to get started.",
        parseHTML: (element) => ctaText(element, ".article-cta__body"),
        renderHTML: () => ({}),
      },
      primaryLabel: {
        default: "Open an account",
        parseHTML: (element) => ctaText(element, ".article-cta__button--primary"),
        renderHTML: () => ({}),
      },
      primaryHref: {
        default: "/accounts",
        parseHTML: (element) => ctaHref(element, ".article-cta__button--primary"),
        renderHTML: () => ({}),
      },
      secondaryLabel: {
        default: "Learn more",
        parseHTML: (element) => ctaText(element, ".article-cta__button--secondary"),
        renderHTML: () => ({}),
      },
      secondaryHref: {
        default: "/contact",
        parseHTML: (element) => ctaHref(element, ".article-cta__button--secondary"),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "section[data-article-cta]" }];
  },
  renderHTML({ node }) {
    const attrs = node.attrs as Record<string, string>;
    return [
      "section",
      { "data-article-cta": "true", class: "article-cta" },
      ["div", { class: "article-cta__copy" },
        ["h2", { class: "article-cta__title" }, attrs.heading],
        ["p", { class: "article-cta__body" }, attrs.body],
      ],
      ["div", { class: "article-cta__actions" },
        ["a", { class: "article-cta__button article-cta__button--primary", href: attrs.primaryHref }, attrs.primaryLabel],
        ["a", { class: "article-cta__button article-cta__button--secondary", href: attrs.secondaryHref }, attrs.secondaryLabel],
      ],
    ];
  },
});

export const editorExtensions = [
  StarterKit.configure({ heading: false, link: false }),
  Heading.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("id"),
          renderHTML: (attributes) => attributes.id ? { id: attributes.id } : {},
        },
      };
    },
  }).configure({ levels: [2, 3, 4] }),
  Link.configure({ openOnClick: false, autolink: true, protocols: ["https", "mailto", "tel"] }),
  Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        mediaId: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-media-id"),
          renderHTML: (attributes) => attributes.mediaId
            ? { "data-media-id": attributes.mediaId }
            : {},
        },
        width: { default: null },
        height: { default: null },
      };
    },
  }).configure({ allowBase64: false }),
  TableKit.configure({ table: { resizable: false } }),
  Callout,
  ArticleCta,
  TextAlignment,
];
