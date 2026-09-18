export function publishedBlogIndexPath(locale: string): string {
  if (locale === "en") return "/blog";
  if (locale === "fa") return "/fa/وبلاگ";
  if (locale === "zh-hans") return "/zh-hans/博客";
  return `/${locale}/blog`;
}

export function publishedArticlePath(locale: string, slug: string): string {
  const encodedSlug = encodeURIComponent(slug).replace(/%2F/gi, "%252F");
  if (locale === "en") return `/${encodedSlug}`;
  if (locale === "fa") return `/fa/${encodedSlug}`;
  return `/${locale}/blog/${encodedSlug}`;
}
