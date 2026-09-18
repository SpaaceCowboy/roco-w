import { toNextJsHandler } from "better-auth/next-js";
import { getAdminAuth } from "@/lib/admin/auth";

function unavailable(): Response {
  return Response.json(
    { error: "Admin authentication is not configured" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request): Promise<Response> {
  const auth = getAdminAuth();
  if (!auth) return unavailable();
  return toNextJsHandler(auth).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  const auth = getAdminAuth();
  if (!auth) return unavailable();
  return toNextJsHandler(auth).POST(request);
}
