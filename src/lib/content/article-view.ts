import type { JSONContent } from "@tiptap/core";
import type { BlogTocItem } from "@/lib/blog";

export function stableArticleSeed(value: string): number {
  let hash = 0;
  for (const character of value) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return Math.abs(hash || 1);
}

export function tableOfContentsForDocument(document: JSONContent): BlogTocItem[] {
  const items: BlogTocItem[] = [];
  const textFor = (node: JSONContent): string => [node.text ?? "", ...(node.content ?? []).map(textFor)]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const visit = (node: JSONContent): void => {
    if (node.type === "heading") {
      const level = Number(node.attrs?.level);
      const id = typeof node.attrs?.id === "string" ? node.attrs.id : "";
      const label = textFor(node);
      if ([2, 3, 4].includes(level) && id && label) items.push({ level, id, label });
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(document);
  return items;
}
