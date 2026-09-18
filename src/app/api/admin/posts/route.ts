import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { createAdminPost } from "@/lib/admin/content-service";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("mutation", session.userId);
    const item = await createAdminPost(await readJsonBody(request, 10_000), session);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
