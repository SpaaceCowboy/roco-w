import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { refreshPublication, transitionPublication } from "@/lib/admin/publication-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    const { id } = await params;
    const transition = await transitionPublication(id, await readJsonBody(request, 10_000), session);
    const result = transition.result as { item?: { locale?: string; slug?: string } };
    const refreshable = ["publish", "unpublish", "archive", "restore"].includes(transition.action);
    const warnings = !transition.replayed && refreshable && result.item?.locale && result.item.slug
      ? await refreshPublication(transition.operationId, result.item.locale, result.item.slug)
      : [];
    return Response.json({ ...transition, warnings });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
