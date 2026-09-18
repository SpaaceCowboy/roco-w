import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { createAdminTranslation, getAdminLocalization } from "@/lib/admin/content-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    const { id } = await params;
    const source = await getAdminLocalization(id);
    const item = await createAdminTranslation(source.postId, await readJsonBody(request, 10_000), session);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
