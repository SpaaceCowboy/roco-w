import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const API = "https://rocobroker.com/wp-json/wp/v2";
const OUTPUT = resolve("src/content/blog/posts.json");
const IMAGE_DIR = resolve("public/blog/images");
const SOURCE_LOCALES = ["en", "fa"];
const ALLOWED_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "a",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
  "hr",
  "img",
]);

async function get(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function imageExtension(mimeType = "", sourceUrl = "") {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return new URL(sourceUrl).pathname.split(".").pop()?.toLowerCase() || "webp";
}

async function downloadFeaturedImage(sourceUrl, destination) {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${sourceUrl}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

function htmlAttribute(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function escapeAttribute(value = "") {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function localizeInlineImages(input, postId, fallbackAlt) {
  const matches = [...input.matchAll(/<img\b[^>]*>/gi)];
  if (!matches.length) return input;
  let output = "";
  let cursor = 0;
  for (const [index, match] of matches.entries()) {
    output += input.slice(cursor, match.index);
    cursor = match.index + match[0].length;
    const sourceUrl = decodeEntities(htmlAttribute(match[0], "src")).trim();
    if (!/^https:\/\//i.test(sourceUrl)) continue;
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${sourceUrl}`);
    const mimeType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
    if (!new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]).has(mimeType)) {
      throw new Error(`Unsupported inline image type ${mimeType || "unknown"}: ${sourceUrl}`);
    }
    const extension = imageExtension(mimeType, sourceUrl);
    const imageName = `${postId}-inline-${index + 1}.${extension}`;
    await writeFile(resolve(IMAGE_DIR, imageName), Buffer.from(await response.arrayBuffer()));
    const alt = plainText(htmlAttribute(match[0], "alt")) || fallbackAlt;
    const title = plainText(htmlAttribute(match[0], "title"));
    output += `<img src="/blog/images/${imageName}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>`;
  }
  return output + input.slice(cursor);
}

function decodeEntities(value = "") {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    rsquo: "’",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, key) => {
    if (key[0] === "#") {
      const hex = key[1]?.toLowerCase() === "x";
      const code = Number.parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

function plainText(html = "") {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[&hellip;\]/g, "…")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function safeHref(raw = "") {
  const href = decodeEntities(raw).trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return href.replace(/"/g, "&quot;");
  return "#";
}

function slugify(value) {
  return plainText(value)
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function sanitizeHtml(input = "") {
  const headingCounts = new Map();
  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
    .replace(/<p>\s*<strong>([^<]{3,120})<\/strong>\s*<\/p>/gi, "<h2>$1</h2>")
    .replace(/<figure\b[^>]*>|<\/figure>|<figcaption\b[^>]*>|<\/figcaption>/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi, (match, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (match.startsWith("</")) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag}>`;
    if (tag === "a") {
      const href = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      return `<a href="${safeHref(href?.[1] ?? href?.[2] ?? href?.[3])}" rel="noopener noreferrer">`;
    }
    if (tag === "img") {
      const src = htmlAttribute(attrs, "src");
      if (!/^\/blog\/images\/[a-z0-9._-]+$/i.test(src)) return "";
      const alt = plainText(htmlAttribute(attrs, "alt"));
      const title = plainText(htmlAttribute(attrs, "title"));
      return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>`;
    }
    if (tag === "ol") {
      const start = attrs.match(/\bstart\s*=\s*["']?(\d+)/i)?.[1];
      return start ? `<ol start="${start}">` : "<ol>";
    }
    return `<${tag}>`;
  });

  html = html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
    const base = slugify(content);
    const count = (headingCounts.get(base) ?? 0) + 1;
    headingCounts.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return `<h${level} id="${id}">${content}</h${level}>`;
  });

  return html.replace(/\s(?:on\w+|style|class)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "").trim();
}

function tableOfContents(contentHtml) {
  return [...contentHtml.matchAll(/<h([2-3]) id="([^"]+)">([\s\S]*?)<\/h\1>/gi)].map(
    ([, level, id, label]) => ({ level: Number(level), id, label: plainText(label) }),
  );
}

function readingMinutes(contentHtml) {
  const words = plainText(contentHtml).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function categoryForPost(locale, post, sourceCategory) {
  if (locale !== "en") return sourceCategory;
  if (["technical-analysis", "fundamental-analysis", "economic-calendar"].includes(post.slug)) {
    return { slug: "market-analysis", name: "Market Analysis" };
  }
  if (["margin-call", "regulation"].includes(post.slug)) {
    return { slug: "risk-regulation", name: "Risk & Regulation" };
  }
  return { slug: "trading-basics", name: "Trading Basics" };
}

async function loadLocale(locale) {
  const lang = locale === "en" ? "en" : locale;
  const common = { per_page: 100, lang };
  const [posts, categories, tags] = await Promise.all([
    get("posts", {
      ...common,
      _embed: "wp:featuredmedia",
      _fields: "id,slug,date,modified,title,excerpt,content,categories,tags,featured_media,_links,_embedded",
    }),
    get("categories", { ...common, _fields: "id,slug,name" }),
    get("tags", { ...common, _fields: "id,slug,name" }),
  ]);
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const tagById = new Map(tags.map((item) => [item.id, item]));

  await mkdir(IMAGE_DIR, { recursive: true });

  return Promise.all(posts.map(async (post) => {
    const title = plainText(post.title?.rendered);
    const contentWithLocalImages = await localizeInlineImages(post.content?.rendered ?? "", post.id, title);
    const contentHtml = sanitizeHtml(contentWithLocalImages);
    const category = categoryById.get(post.categories?.[0]);
    const sourceCategory = category
      ? { slug: category.slug, name: decodeEntities(category.name) }
      : { slug: "insights", name: locale === "fa" ? "وبلاگ" : "Insights" };
    const media = post._embedded?.["wp:featuredmedia"]?.[0];
    if (!media?.source_url) throw new Error(`Post ${post.id} has no featured image`);
    const extension = imageExtension(media.mime_type, media.source_url);
    const imageName = `${post.id}.${extension}`;
    await downloadFeaturedImage(media.source_url, resolve(IMAGE_DIR, imageName));

    return {
      sourceId: post.id,
      locale,
      slug: decodeURIComponent(post.slug),
      title,
      excerpt: plainText(post.excerpt?.rendered).replace(/\s*…\s*$/, "…"),
      category: categoryForPost(locale, post, sourceCategory),
      tags: (post.tags ?? [])
        .map((id) => tagById.get(id))
        .filter(Boolean)
        .map((tag) => ({ slug: tag.slug, name: decodeEntities(tag.name) })),
      publishedAt: post.date,
      updatedAt: post.modified,
      author: "ROCO Editorial",
      readingMinutes: readingMinutes(contentHtml),
      featuredImage: `/blog/images/${imageName}`,
      featuredImageAlt: plainText(media.alt_text) || plainText(post.title?.rendered),
      featuredImageWidth: media.media_details?.width ?? 1200,
      featuredImageHeight: media.media_details?.height ?? 675,
      contentHtml,
      tableOfContents: tableOfContents(contentHtml),
    };
  }));
}

const migrated = (await Promise.all(SOURCE_LOCALES.map(loadLocale))).flat();
migrated.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify({ schemaVersion: 2, posts: migrated }, null, 2)}\n`,
  "utf8",
);

console.log(`Imported ${migrated.length} posts to ${OUTPUT}`);
for (const locale of SOURCE_LOCALES) {
  console.log(`  ${locale}: ${migrated.filter((post) => post.locale === locale).length}`);
}
