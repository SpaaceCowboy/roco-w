import "server-only";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const PRESIGNED_URL_TTL_SECONDS = 5 * 60;

type Mt5StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  objectKey: string;
};

function readConfig(): Mt5StorageConfig {
  const config = {
    endpoint: process.env.MT5_S3_ENDPOINT,
    region: process.env.MT5_S3_REGION ?? "us-east-1",
    accessKeyId: process.env.MT5_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.MT5_S3_SECRET_ACCESS_KEY,
    bucket: process.env.MT5_S3_BUCKET,
    objectKey: process.env.MT5_S3_OBJECT_KEY,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) throw new Error(`Incomplete MT5 download storage configuration: ${missing.join(", ")}`);

  const endpoint = new URL(config.endpoint!);
  if (endpoint.protocol !== "https:") throw new Error("MT5 download storage endpoint must use HTTPS");

  return { ...config, endpoint: endpoint.origin } as Mt5StorageConfig;
}

export async function createMt5DownloadUrl(correlationId: string): Promise<string> {
  const config = readConfig();
  const storage = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 3,
    requestHandler: new NodeHttpHandler({ connectionTimeout: 3_000, requestTimeout: 10_000 }),
  });

  const startedAt = performance.now();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: config.objectKey,
    ResponseContentDisposition: 'attachment; filename="rocobroker5setup.exe"',
    ResponseContentType: "application/vnd.microsoft.portable-executable",
  });

  try {
    const url = await getSignedUrl(storage, command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
    console.info("MT5 download URL created", {
      correlationId,
      latencyMs: Math.round(performance.now() - startedAt),
      expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
    });
    return url;
  } catch (error) {
    console.error("MT5 download URL creation failed", {
      correlationId,
      latencyMs: Math.round(performance.now() - startedAt),
      errorCode: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}
