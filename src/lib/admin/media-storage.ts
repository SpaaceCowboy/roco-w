import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { auditEvents, media } from "@/db/schema";
import type { AdminSession } from "./session";
import { requireAdminPermission } from "./permissions";
import { adminEvents, reportAdminFailure, reportAdminSuccess } from "./observability";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 12_000;
const supportedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(Object.keys(supportedTypes) as [keyof typeof supportedTypes, ...(keyof typeof supportedTypes)[]]),
  byteSize: z.number().int().positive().max(MAX_IMAGE_BYTES),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const uploadGrantSchema = uploadRequestSchema.extend({
  v: z.literal(1),
  key: z.string().regex(/^content\/images\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/),
  expiresAt: z.number().int().positive(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
type UploadGrant = z.infer<typeof uploadGrantSchema>;

type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function readStorageConfig(): StorageConfig {
  const config = {
    endpoint: process.env.CONTENT_MEDIA_S3_ENDPOINT,
    region: process.env.CONTENT_MEDIA_S3_REGION ?? "auto",
    accessKeyId: process.env.CONTENT_MEDIA_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.CONTENT_MEDIA_S3_SECRET_ACCESS_KEY,
    bucket: process.env.CONTENT_MEDIA_S3_BUCKET,
    publicBaseUrl: process.env.CONTENT_MEDIA_PUBLIC_BASE_URL,
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Incomplete content media storage configuration: ${missing.join(", ")}`);
  const endpoint = new URL(config.endpoint!);
  const publicBaseUrl = new URL(config.publicBaseUrl!);
  if (endpoint.protocol !== "https:" || publicBaseUrl.protocol !== "https:") throw new Error("Content media URLs must use HTTPS");
  return { ...config, endpoint: endpoint.origin, publicBaseUrl: publicBaseUrl.href.replace(/\/$/, "") } as StorageConfig;
}

function client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    maxAttempts: 3,
    requestHandler: new NodeHttpHandler({ connectionTimeout: 3_000, requestTimeout: 15_000 }),
  });
}

function tokenSecret(): string {
  const value = process.env.ADMIN_AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_AUTH_SECRET must contain at least 32 characters");
  return value;
}

function signGrant(encoded: string): Buffer {
  return createHmac("sha256", tokenSecret()).update("media-upload:v1:").update(encoded).digest();
}

function encodeGrant(grant: UploadGrant): string {
  const encoded = Buffer.from(JSON.stringify(grant), "utf8").toString("base64url");
  return `${encoded}.${signGrant(encoded).toString("base64url")}`;
}

function decodeGrant(token: string): UploadGrant {
  const [encoded, suppliedValue, extra] = token.split(".");
  if (!encoded || !suppliedValue || extra) throw new Error("Invalid upload grant");
  const supplied = Buffer.from(suppliedValue, "base64url");
  const expected = signGrant(encoded);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Invalid upload grant");
  const grant = uploadGrantSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  if (grant.expiresAt <= Date.now()) throw new Error("Upload grant expired");
  return grant;
}

export function isMediaStorageConfigured(): boolean {
  return Boolean(
    process.env.CONTENT_MEDIA_S3_ENDPOINT && process.env.CONTENT_MEDIA_S3_ACCESS_KEY_ID &&
    process.env.CONTENT_MEDIA_S3_SECRET_ACCESS_KEY && process.env.CONTENT_MEDIA_S3_BUCKET &&
    process.env.CONTENT_MEDIA_PUBLIC_BASE_URL,
  );
}

export function getMediaPublicUrl(storageKey: string): string {
  return `${readStorageConfig().publicBaseUrl}/${storageKey}`;
}

export async function createMediaUpload(rawInput: unknown, session: AdminSession) {
  requireAdminPermission(session.role, "media:write");
  const input = uploadRequestSchema.parse(rawInput);
  const config = readStorageConfig();
  const key = `content/images/${crypto.randomUUID()}.${supportedTypes[input.mimeType]}`;
  const expiresAt = Date.now() + 5 * 60_000;
  const metadata = { sha256: input.checksumSha256 };
  const command = new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: input.mimeType, Metadata: metadata });
  const uploadUrl = await getSignedUrl(client(config), command, { expiresIn: 300 });
  const completionToken = encodeGrant({ v: 1, key, expiresAt, ...input });
  return {
    uploadUrl,
    completionToken,
    requiredHeaders: { "content-type": input.mimeType, "x-amz-meta-sha256": input.checksumSha256 },
    expiresInSeconds: 300,
  };
}

export async function completeMediaUpload(completionToken: string, session: AdminSession) {
  requireAdminPermission(session.role, "media:write");
  const grant = decodeGrant(completionToken);
  const config = readStorageConfig();
  const storage = client(config);
  const correlationId = crypto.randomUUID();
  const startedAt = performance.now();
  let shouldDelete = true;
  let outcome = "failure";
  let errorCode: string | undefined;
  try {
    const head = await storage.send(new HeadObjectCommand({ Bucket: config.bucket, Key: grant.key }));
    if (head.ContentLength !== grant.byteSize || head.ContentLength > MAX_IMAGE_BYTES) throw new Error("Uploaded size does not match the grant");
    if (head.ContentType !== grant.mimeType) throw new Error("Uploaded media type does not match the grant");
    if (head.Metadata?.sha256 !== grant.checksumSha256) throw new Error("Uploaded checksum metadata does not match the grant");

    const object = await storage.send(new GetObjectCommand({ Bucket: config.bucket, Key: grant.key }));
    if (!object.Body) throw new Error("Uploaded object has no body");
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    if (bytes.byteLength !== grant.byteSize) throw new Error("Uploaded object changed during validation");
    const actualChecksum = createHash("sha256").update(bytes).digest("hex");
    if (actualChecksum !== grant.checksumSha256) throw new Error("Uploaded checksum is invalid");

    const details = await sharp(bytes, { limitInputPixels: MAX_IMAGE_EDGE * MAX_IMAGE_EDGE }).metadata();
    const detectedMime = details.format === "heif" ? "image/avif" : details.format ? `image/${details.format}` : null;
    if (detectedMime !== grant.mimeType || !details.width || !details.height) throw new Error("Uploaded bytes are not an approved image type");
    if (details.width > MAX_IMAGE_EDGE || details.height > MAX_IMAGE_EDGE) throw new Error("Uploaded image dimensions are too large");

    const existing = await getDatabase().select().from(media)
      .where(and(eq(media.checksumSha256, actualChecksum), isNull(media.deletedAt))).limit(1);
    if (existing[0]) {
      await storage.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: grant.key }));
      shouldDelete = false;
      outcome = "deduplicated";
      return { item: existing[0], url: `${config.publicBaseUrl}/${existing[0].storageKey}`, deduplicated: true };
    }

    const [item] = await getDatabase().transaction(async (tx) => {
      const inserted = await tx.insert(media).values({
        storageKey: grant.key,
        originalFilename: grant.filename,
        mimeType: grant.mimeType,
        byteSize: grant.byteSize,
        checksumSha256: actualChecksum,
        width: details.width,
        height: details.height,
        uploadedById: session.userId,
      }).returning();
      await tx.insert(auditEvents).values({
        actorId: session.userId,
        action: "media.upload.complete",
        entityType: "media",
        entityId: inserted[0].id,
        outcome: "success",
        correlationId,
        metadata: { mimeType: grant.mimeType, byteSize: grant.byteSize, width: details.width!, height: details.height! },
      });
      return inserted;
    });
    shouldDelete = false;
    outcome = "success";
    return { item, url: `${config.publicBaseUrl}/${item.storageKey}`, deduplicated: false };
  } catch (error) {
    errorCode = error instanceof Error ? error.name : "UnknownError";
    throw error;
  } finally {
    if (shouldDelete) {
      await storage.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: grant.key })).catch((error) => {
        console.error("Failed to remove rejected media object", { correlationId, name: error instanceof Error ? error.name : "UnknownError" });
      });
    }
    const latencyMs = Math.round(performance.now() - startedAt);
    if (outcome === "failure") reportAdminFailure(adminEvents.mediaUpload, { correlationId, errorCode, latencyMs });
    else reportAdminSuccess(adminEvents.mediaUpload, { correlationId, outcome, latencyMs });
  }
}

export async function importTrustedMedia(input: {
  bytes: Buffer;
  filename: string;
  storageKey: string;
  mimeType: keyof typeof supportedTypes;
}) {
  if (input.bytes.byteLength <= 0 || input.bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Imported image size is not allowed");
  const details = await sharp(input.bytes, { limitInputPixels: MAX_IMAGE_EDGE * MAX_IMAGE_EDGE }).metadata();
  const detectedMime = details.format === "heif" ? "image/avif" : details.format ? `image/${details.format}` : null;
  if (detectedMime !== input.mimeType || !details.width || !details.height) throw new Error("Imported media bytes do not match the declared image type");
  if (details.width > MAX_IMAGE_EDGE || details.height > MAX_IMAGE_EDGE) throw new Error("Imported image dimensions are too large");
  const checksumSha256 = createHash("sha256").update(input.bytes).digest("hex");
  const [existing] = await getDatabase().select().from(media).where(and(eq(media.checksumSha256, checksumSha256), isNull(media.deletedAt))).limit(1);
  if (existing) return existing;

  const config = readStorageConfig();
  const storage = client(config);
  const correlationId = crypto.randomUUID();
  const startedAt = performance.now();
  let uploaded = false;
  try {
    await storage.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.storageKey,
      Body: input.bytes,
      ContentType: input.mimeType,
      Metadata: { sha256: checksumSha256 },
    }));
    uploaded = true;
    const [item] = await getDatabase().insert(media).values({
      storageKey: input.storageKey,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      byteSize: input.bytes.byteLength,
      checksumSha256,
      width: details.width,
      height: details.height,
    }).returning();
    reportAdminSuccess(adminEvents.mediaUpload, { correlationId, source: "import", latencyMs: Math.round(performance.now() - startedAt) });
    return item;
  } catch (error) {
    reportAdminFailure(adminEvents.mediaUpload, {
      correlationId, source: "import", latencyMs: Math.round(performance.now() - startedAt),
      errorCode: error instanceof Error ? error.name : "UnknownError",
    });
    if (uploaded) await storage.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: input.storageKey })).catch(() => undefined);
    throw error;
  }
}
