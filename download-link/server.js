import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client } from "@aws-sdk/client-s3";
import { createApp } from "./app.js";

const required = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "ADMIN_TOKEN"];
for (const name of required) {
  if (!process.env[name]) { console.error(`Missing required environment variable: ${name}`); process.exit(1); }
}
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const storage = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() === "true",
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  maxAttempts: 3,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
});
const app = await createApp({
  storage, bucket: process.env.S3_BUCKET, adminToken: process.env.ADMIN_TOKEN,
  dataFile: path.resolve(process.env.DATA_FILE || fileURLToPath(new URL("./data/uploads.json", import.meta.url))),
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  uploadUrlSeconds: Number(process.env.UPLOAD_URL_SECONDS || 900)
});
const server = app.listen(port, host, () => {
  console.info(`Support downloads listening on http://${host}:${server.address().port}`);
});
server.on("error", error => { console.error("Listener failed", { errorCode: error.code }); process.exitCode = 1; });
