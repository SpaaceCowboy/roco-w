import { toNextJsHandler } from "better-auth/next-js";
import { getAdminAuth } from "@/lib/admin/auth";
import {
  adminEvents,
  logAdminEvent,
  reportAdminFailure,
} from "@/lib/admin/observability";
import {
  staffAuthRouteAllowed,
  staffMode,
  trustedStaffProxy,
} from "@/lib/admin/staff-policy";

function unavailable(): Response {
  return Response.json(
    { error: "Admin authentication is not configured" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function handle(
  request: Request,
  method: "GET" | "POST",
): Promise<Response> {
  try {
    if (staffMode()) {
      const path = new URL(request.url).pathname.slice("/api/auth".length);
      if (!trustedStaffProxy(request.headers) || !staffAuthRouteAllowed(path))
        return Response.json({ error: "NOT_FOUND" }, { status: 404 });
      if (method === "POST") {
        if (
          request.headers.get("origin") !==
          new URL(process.env.ADMIN_AUTH_BASE_URL!).origin
        )
          return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
        const body = await request.clone().text();
        if (Buffer.byteLength(body) > 8192)
          return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
        let parsed;
        try {
          parsed = body.trim() ? JSON.parse(body) : {};
        } catch {
          return Response.json({ error: "INVALID_JSON" }, { status: 400 });
        }
        if (
          parsed?.trustDevice === true ||
          (path === "/two-factor/enable" && parsed?.method === "otp")
        )
          return Response.json({ error: "INVALID_METHOD" }, { status: 400 });
      }
    }
    const auth = getAdminAuth();
    if (!auth) return unavailable();
    const response = await toNextJsHandler(auth)[method](request);
    if (response.status >= 500) {
      reportAdminFailure(adminEvents.auth, {
        stage: `route_${method.toLowerCase()}`,
        status: response.status,
      });
    } else if (response.status === 401 || response.status === 403) {
      logAdminEvent(adminEvents.auth, "denied", {
        stage: `route_${method.toLowerCase()}`,
        status: response.status,
      });
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
