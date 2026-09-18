import { adminApiErrorResponse, assertSameOrigin, requireAdminApiSession } from "@/lib/admin/api";
import { retryPublicationRefresh } from "@/lib/admin/publication-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    const { id } = await params;
    return Response.json(await retryPublicationRefresh(id, session));
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
