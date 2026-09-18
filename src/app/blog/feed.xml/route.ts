import { blogFeedResponse } from "@/lib/blogFeed";

export async function GET() {
  return blogFeedResponse("en");
}
