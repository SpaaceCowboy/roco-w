import { getPublishedContentRepository } from "@/lib/content/content-source";
import { localizedUrl } from "@/lib/seo";

function xml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!);
}

export async function createBlogFeed(locale: string): Promise<string> {
  const posts = await getPublishedContentRepository().listIndexablePosts(locale);
  const title = locale === "fa" ? "وبلاگ ROCO Broker" : "ROCO Broker Blog";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${xml(title)}</title><link>${xml(localizedUrl(locale, "/blog"))}</link><description>${xml(title)}</description><language>${xml(locale)}</language>
${posts.map((post) => `<item><title>${xml(post.title)}</title><link>${xml(localizedUrl(locale, `/blog/${post.slug}`))}</link><guid isPermaLink="true">${xml(localizedUrl(locale, `/blog/${post.slug}`))}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><description>${xml(post.excerpt)}</description></item>`).join("\n")}
</channel></rss>`;
}

export async function blogFeedResponse(locale: string): Promise<Response> {
  return new Response(await createBlogFeed(locale), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
