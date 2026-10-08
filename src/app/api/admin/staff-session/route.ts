import { randomUUID } from "node:crypto";
import { getVerifiedStaffSession } from "@/lib/admin/staff-session";
import {
  serviceAuthorized,
  staffMode,
  staffServiceSecret,
} from "@/lib/admin/staff-policy";
import { logAdminEvent, adminEvents } from "@/lib/admin/observability";

export async function GET(request: Request) {
  const started = Date.now(),
    correlationId = randomUUID();
  let status = 503;
  try {
    if (!staffMode())
      return Response.json({ error: "STAFF_AUTH_DISABLED" }, { status: 503 });
    if (!serviceAuthorized(request.headers, staffServiceSecret())) {
      status = 401;
      return Response.json(
        { error: "UNAUTHORIZED" },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    const session = await getVerifiedStaffSession(request.headers);
    status = session ? 200 : 401;
    return Response.json(session ?? { error: "SIGN_IN_REQUIRED" }, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "STAFF_AUTH_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    logAdminEvent(
      adminEvents.auth,
      status === 200 ? "success" : status === 401 ? "denied" : "failure",
      {
        stage: "staff_session",
        correlationId,
        status,
        latencyMs: Date.now() - started,
      },
    );
  }
}
