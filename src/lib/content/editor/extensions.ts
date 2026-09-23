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
  TextAlignment,
];
