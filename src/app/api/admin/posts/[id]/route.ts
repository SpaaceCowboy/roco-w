import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { deleteAdminContent, saveAdminDraft } from "@/lib/admin/content-service";
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("mutation", session.userId);
    const { id } = await params;
    const result = await deleteAdminContent(id, await readJsonBody(request, 10_000), session);
    return Response.json(result);
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
