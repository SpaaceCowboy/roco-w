import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { saveAdminDraft } from "@/lib/admin/content-service";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("autosave", session.userId);
    const { id } = await params;
    const result = await saveAdminDraft(id, await readJsonBody(request), session);
    return Response.json(result);
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
