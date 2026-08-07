import { notFound } from "next/navigation";

/**
 * Catch-all for any unmatched path under a locale (e.g. /platforms/metatrader-5/2).
 * Throws notFound() so the styled `[locale]/not-found.tsx` renders instead of the
 * framework's default 404.
 */
export default function CatchAllNotFound() {
  notFound();
}
