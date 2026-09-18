import { z } from "zod";
import { adminApiErrorResponse, assertSameOrigin, readJsonBody, requireAdminApiSession } from "@/lib/admin/api";
import { completeMediaUpload, createMediaUpload } from "@/lib/admin/media-storage";
import { enforceAdminRateLimit } from "@/lib/admin/rate-limit";

const completionSchema = z.object({ completionToken: z.string().min(1).max(2_000) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("upload", session.userId);
    return Response.json(await createMediaUpload(await readJsonBody(request, 10_000), session), { status: 201 });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireAdminApiSession();
    enforceAdminRateLimit("upload", session.userId);
    const input = completionSchema.parse(await readJsonBody(request, 10_000));
    return Response.json(await completeMediaUpload(input.completionToken, session));
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
