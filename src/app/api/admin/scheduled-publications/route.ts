import { timingSafeEqual } from "node:crypto";
import { publishDueScheduledContent } from "@/lib/admin/publication-service";

function authorized(request: Request): boolean {
  const configured = process.env.SCHEDULED_PUBLISH_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || configured.length < 32 || configured.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const outcomes = await publishDueScheduledContent();
    return Response.json({ processed: outcomes.length, outcomes });
  } catch (error) {
    console.error("Scheduled publication batch failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Scheduled publication batch failed" }, { status: 500 });
  }
}
