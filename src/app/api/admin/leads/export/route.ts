import { adminApiErrorResponse, requireAdminApiSession } from "@/lib/admin/api";
import { exportLeadsForAdmin } from "@/lib/admin/lead-service";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";

/**
 * Excel download of every lead. A plain GET so the admin page can use a normal
 * download link. Cross-site requests (an <img> on another site) are refused so
 * they can't fill the audit log with fake exports or use up the rate limit.
 */
export async function GET(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return Response.json({ error: "Cross-site request refused" }, { status: 403 });
  }
  try {
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("export", session.userId);
    const { file } = await exportLeadsForAdmin(session);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="roco-leads-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
