import { adminApiErrorResponse, assertSameOrigin, requireAdminApiSession } from "@/lib/admin/api";
import { getAdminLocalization } from "@/lib/admin/content-service";
import { createPreviewToken } from "@/lib/admin/preview-token";
import { requireAdminPermission } from "@/lib/admin/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    requireAdminPermission(session.role, "content:read");
    const { id } = await params;
    const item = await getAdminLocalization(id);
    const token = createPreviewToken(item.id, item.locale);
    return Response.json({ url: `/${item.locale}/preview/${token}`, expiresInSeconds: 900 });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
