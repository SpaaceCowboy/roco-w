import { z } from "zod";
import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { rollbackAdminRevision } from "@/lib/admin/content-service";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

const rollbackSchema = z.object({ revisionNumber: z.number().int().positive(), version: z.number().int().positive() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("mutation", session.userId);
    const { id } = await params;
    const input = rollbackSchema.parse(await readJsonBody(request, 10_000));
    return Response.json(await rollbackAdminRevision(id, input.revisionNumber, input.version, session));
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
