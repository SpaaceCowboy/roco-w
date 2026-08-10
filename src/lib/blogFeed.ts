import { getBlogPosts } from "@/lib/blog";
import { localizedUrl } from "@/lib/seo";

function xml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!);
}

export function createBlogFeed(locale: string): string {
  const posts = getBlogPosts(locale);
  const title = locale === "fa" ? "وبلاگ ROCO Broker" : "ROCO Broker Blog";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${xml(title)}</title><link>${xml(localizedUrl(locale, "/blog"))}</link><description>${xml(title)}</description><language>${xml(locale)}</language>
${posts.map((post) => `<item><title>${xml(post.title)}</title><link>${xml(localizedUrl(locale, `/blog/${post.slug}`))}</link><guid isPermaLink="true">${xml(localizedUrl(locale, `/blog/${post.slug}`))}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><description>${xml(post.excerpt)}</description></item>`).join("\n")}
</channel></rss>`;
}

export function blogFeedResponse(locale: string): Response {
  return new Response(createBlogFeed(locale), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
