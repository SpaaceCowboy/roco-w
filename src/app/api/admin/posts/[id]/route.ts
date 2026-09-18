import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { saveAdminDraft } from "@/lib/admin/content-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    const { id } = await params;
    const result = await saveAdminDraft(id, await readJsonBody(request), session);
    return Response.json(result);
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
