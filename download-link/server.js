import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const required = [
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "ADMIN_TOKEN"
];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const LINK_LIFETIME_MS = Number(process.env.LINK_LIFETIME_HOURS || 2) * 60 * 60 * 1000;
const UPLOAD_URL_SECONDS = Number(process.env.UPLOAD_URL_SECONDS || 900);
const DOWNLOAD_URL_MAX_SECONDS = Number(process.env.DOWNLOAD_URL_MAX_SECONDS || 300);
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, "data", "uploads.json"));

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() === "true",
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  maxAttempts: 3,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

async function storageRequest(operation, command) {
  const correlationId = crypto.randomUUID();
  const startedAt = performance.now();
  try {
    const result = await s3.send(command, { abortSignal: AbortSignal.timeout(15_000) });
    console.info("Storage request completed", {
      operation,
      correlationId,
      latencyMs: Math.round(performance.now() - startedAt),
      status: result.$metadata?.httpStatusCode
    });
    return result;
  } catch (error) {
    console.error("Storage request failed", {
      operation,
      correlationId,
      latencyMs: Math.round(performance.now() - startedAt),
      status: error.$metadata?.httpStatusCode,
      errorCode: error.name
    });
    throw error;
  }
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

let dbQueue = Promise.resolve();

async function ensureDb() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ uploads: [] }, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw || '{"uploads":[]}');
  if (!Array.isArray(parsed.uploads)) parsed.uploads = [];
  return parsed;
}

async function writeDb(db) {
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(db, null, 2));
  await fs.rename(temp, DATA_FILE);
}

function mutateDb(fn) {
  const run = dbQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  dbQueue = run.catch(() => {});
  return run;
}

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ""));
  const B = Buffer.from(String(b || ""));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function requireAdmin(req, res, next) {
  if (!safeEqual(req.get("X-Admin-Token"), process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
  next();
}

function sanitizeFilename(name) {
  return String(name || "video")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "video";
}

function publicBase(req) {
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
}

function viewRecord(req, u) {
  return {
    id: u.id,
    filename: u.filename,
    contentType: u.contentType,
    size: u.size,
    status: u.status,
    createdAt: u.createdAt,
    completedAt: u.completedAt || null,
    firstUsedAt: u.firstUsedAt || null,
    expiresAt: u.expiresAt || null,
    revoked: Boolean(u.revoked),
    downloadUrl: `${publicBase(req)}/d/${u.token}`
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/uploads", requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const uploads = [...db.uploads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(u => viewRecord(req, u));
    res.json({ uploads });
  } catch (e) { next(e); }
});

app.post("/api/uploads/init", requireAdmin, async (req, res, next) => {
  try {
    const filename = sanitizeFilename(req.body.filename);
    const contentType = String(req.body.contentType || "application/octet-stream").slice(0, 120);
    const size = Number(req.body.size || 0);

    if (!Number.isFinite(size) || size <= 0) {
      return res.status(400).json({ error: "Invalid file size" });
    }
    if (!contentType.startsWith("video/") && !/\.(mkv|avi|m4v|mp4|mov|webm)$/i.test(filename)) {
      return res.status(400).json({ error: "Only video uploads are allowed" });
    }

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(24).toString("base64url");
    const day = new Date().toISOString().slice(0, 10);
    const objectKey = `videos/${day}/${id}-${filename}`;
    // ParsPack adds its own download disposition. Storing another header on
    // the object causes Chrome to reject the response as duplicate headers.
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: objectKey,
      ContentType: contentType
    });
    const putUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_SECONDS });

    const record = {
      id,
      token,
      objectKey,
      filename,
      contentType,
      size,
      status: "uploading",
      createdAt: new Date().toISOString(),
      completedAt: null,
      firstUsedAt: null,
      expiresAt: null,
      revoked: false
    };

    await mutateDb(db => { db.uploads.push(record); });
    res.status(201).json({
      id,
      putUrl,
      putHeaders: {
        "Content-Type": contentType
      }
    });
  } catch (e) { next(e); }
});

app.post("/api/uploads/:id/complete", requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const rec = db.uploads.find(x => x.id === req.params.id);
    if (!rec) return res.status(404).json({ error: "Upload not found" });

    const head = await storageRequest("head", new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: rec.objectKey
    }));

    if (Number(head.ContentLength) !== Number(rec.size)) {
      return res.status(409).json({ error: "Uploaded object size does not match the expected file size" });
    }

    const updated = await mutateDb(db2 => {
      const u = db2.uploads.find(x => x.id === req.params.id);
      if (!u) throw new Error("Upload disappeared");
      u.status = "ready";
      u.completedAt = new Date().toISOString();
      return u;
    });

    res.json({ ok: true, upload: viewRecord(req, updated) });
  } catch (e) { next(e); }
});

app.post("/api/uploads/:id/revoke", requireAdmin, async (req, res, next) => {
  try {
    const updated = await mutateDb(db => {
      const u = db.uploads.find(x => x.id === req.params.id);
      if (!u) return null;
      u.revoked = true;
      return u;
    });
    if (!updated) return res.status(404).json({ error: "Upload not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.post("/api/uploads/:id/regenerate", requireAdmin, async (req, res, next) => {
  try {
    const updated = await mutateDb(db => {
      const u = db.uploads.find(x => x.id === req.params.id);
      if (!u) return null;
      if (u.status !== "ready") throw Object.assign(new Error("Upload is not ready"), { status: 409 });
      u.token = crypto.randomBytes(24).toString("base64url");
      u.firstUsedAt = null;
      u.expiresAt = null;
      u.revoked = false;
      return u;
    });
    if (!updated) return res.status(404).json({ error: "Upload not found" });
    res.json({ ok: true, upload: viewRecord(req, updated) });
  } catch (e) { next(e); }
});

app.delete("/api/uploads/:id", requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const rec = db.uploads.find(x => x.id === req.params.id);
    if (!rec) return res.status(404).json({ error: "Upload not found" });

    try {
      await storageRequest("delete", new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: rec.objectKey
      }));
    } catch {
      return res.status(502).json({ error: "Could not delete the object from storage" });
    }

    await mutateDb(db2 => {
      db2.uploads = db2.uploads.filter(x => x.id !== req.params.id);
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.get("/d/:token", async (req, res, next) => {
  try {
    const now = Date.now();

    const rec = await mutateDb(db => {
      const u = db.uploads.find(x => safeEqual(x.token, req.params.token));
      if (!u) return null;
      if (u.status !== "ready") return { ...u, blocked: "not-ready" };
      if (u.revoked) return { ...u, blocked: "revoked" };

      if (!u.firstUsedAt) {
        u.firstUsedAt = new Date(now).toISOString();
        u.expiresAt = new Date(now + LINK_LIFETIME_MS).toISOString();
      }

      if (new Date(u.expiresAt).getTime() <= now) {
        return { ...u, blocked: "expired" };
      }
      return { ...u };
    });

    if (!rec) return res.status(404).send("Download link not found.");
    if (rec.blocked === "not-ready") return res.status(409).send("This file is not ready yet.");
    if (rec.blocked === "revoked") return res.status(403).send("This download link has been revoked.");
    if (rec.blocked === "expired") return res.status(403).send("This download link has expired.");

    const remainingMs = new Date(rec.expiresAt).getTime() - now;
    const signedSeconds = Math.max(
      1,
      Math.min(DOWNLOAD_URL_MAX_SECONDS, Math.ceil(remainingMs / 1000))
    );

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: rec.objectKey
    });
    const storageUrl = await getSignedUrl(s3, command, { expiresIn: signedSeconds });

    res.set("Cache-Control", "no-store, private");
    res.redirect(302, storageUrl);
  } catch (e) { next(e); }
});

// Express identifies error middleware by its four-argument signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
  const status = Number(err.status || 500);
  console.error("Request failed", {
    correlationId: crypto.randomUUID(),
    status,
    errorCode: err.name
  });
  res.status(status).json({
    error: status >= 500 ? "Internal server error" : err.message
  });
});

await ensureDb();
app.listen(PORT, HOST, () => {
  console.log(`Secure Video Delivery listening on http://${HOST}:${PORT}`);
});
