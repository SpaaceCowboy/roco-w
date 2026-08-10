import { blogFeedResponse } from "@/lib/blogFeed";

export function GET() {
  return blogFeedResponse("en");
}
