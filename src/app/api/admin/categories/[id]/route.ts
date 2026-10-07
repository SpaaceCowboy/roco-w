import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { deleteCategory, updateCategory } from "@/lib/admin/category-service";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("mutation", session.userId);
    const { id } = await params;
    const item = await updateCategory(id, await readJsonBody(request, 20_000), session);
    return Response.json({ item });
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
    await deleteCategory(id, session);
    return new Response(null, { status: 204 });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
