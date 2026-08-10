import { routing } from "@/i18n/routing";
import { blogFeedResponse } from "@/lib/blogFeed";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return new Response("Not found", { status: 404 });
  }
  return blogFeedResponse(locale);
}
