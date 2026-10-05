import { NextResponse } from "next/server";
import { createMt5DownloadUrl } from "@/lib/mt5-download";

export const runtime = "nodejs";

export async function GET() {
  const correlationId = crypto.randomUUID();
  const url = await createMt5DownloadUrl(correlationId);
  return NextResponse.redirect(url, 302);
}
