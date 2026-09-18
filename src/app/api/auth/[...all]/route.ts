import { toNextJsHandler } from "better-auth/next-js";
import { getAdminAuth } from "@/lib/admin/auth";
import { adminEvents, logAdminEvent, reportAdminFailure } from "@/lib/admin/observability";

function unavailable(): Response {
  return Response.json(
    { error: "Admin authentication is not configured" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function handle(request: Request, method: "GET" | "POST"): Promise<Response> {
  try {
    const auth = getAdminAuth();
    if (!auth) return unavailable();
    const response = await toNextJsHandler(auth)[method](request);
    if (response.status >= 500) {
      reportAdminFailure(adminEvents.auth, { stage: `route_${method.toLowerCase()}`, status: response.status });
    } else if (response.status === 401 || response.status === 403) {
      logAdminEvent(adminEvents.auth, "denied", { stage: `route_${method.toLowerCase()}`, status: response.status });
    }
    return response;
  } catch (error) {
    reportAdminFailure(adminEvents.auth, {
      stage: `route_${method.toLowerCase()}`,
      errorCode: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Authentication request failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request, "GET");
}

export async function POST(request: Request): Promise<Response> {
  return handle(request, "POST");
}
