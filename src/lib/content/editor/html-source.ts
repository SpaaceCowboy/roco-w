const BLOCK_TAGS = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "hr", "img",
  "table", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td", "aside", "section", "div",
]);
const VOID_TAGS = new Set(["hr", "img", "col"]);

/** Format editor-generated HTML without adding whitespace inside inline text or pre blocks. */
export function formatHtmlSource(html: string): string {
  // Keep quoted attributes intact, including attribute values containing >.
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[a-z][a-z0-9:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>|[^<]+|</gi) ?? [];
  let output = "";
  let whitespace = "";
  let depth = 0;
  let inPre = false;
  let previousBlock = false;

  for (const token of tokens) {
    if (!inPre && /^\s+$/.test(token)) {
      whitespace += token;
      continue;
    }

    const tag = /^<(\/?)([a-z][a-z0-9:-]*)\b/i.exec(token);
    const name = tag?.[2].toLowerCase();
    const closing = tag?.[1] === "/";
    const block = Boolean(name && BLOCK_TAGS.has(name));
    const voidTag = Boolean(name && VOID_TAGS.has(name)) || /\/\s*>$/.test(token);

    if (block && closing && (!inPre || name === "pre")) depth = Math.max(0, depth - 1);

    if (!inPre && block && previousBlock) {
      output += `\n${"  ".repeat(depth)}`;
    } else {
      output += whitespace;
    }
    whitespace = "";
    output += token;

    if (inPre) {
      if (closing && name === "pre") {
        inPre = false;
        previousBlock = true;
      }
      continue;
    }

    if (block && !closing && !voidTag) depth += 1;
    if (name === "pre" && !closing) inPre = true;
    previousBlock = block;
  }

  return output + whitespace;
}
