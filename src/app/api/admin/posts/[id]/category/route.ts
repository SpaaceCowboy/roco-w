import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { setPostCategory } from "@/lib/admin/category-service";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("mutation", session.userId);
    const { id } = await params;
    return Response.json(await setPostCategory(id, await readJsonBody(request, 1_000), session));
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
