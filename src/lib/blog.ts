/**
 * The blog is NOT part of this Next.js app. It stays on WordPress + WPML at
 * blog.rocobroker.com, where the editors keep posting exactly as they do today.
 * The site's "Blog" link is just an external link into that WordPress install.
 *
 * `blogUrl(locale)` returns the blog URL for the visitor's current language so
 * the language carries across when they click through.
 */
const BLOG_BASE = "https://blog.rocobroker.com";

// Maps a site locale to its WPML blog path prefix. Adjust if WPML uses
// different codes on the WordPress side.
const localeToBlogPath: Record<string, string> = {
  en: "",
  de: "/de",
  ru: "/ru",
  ar: "/ar",
  fa: "/fa",
  "zh-hans": "/zh-hans",
};

export function blogUrl(locale: string): string {
  const path = localeToBlogPath[locale] ?? "";
  return `${BLOG_BASE}${path}/`;
}
