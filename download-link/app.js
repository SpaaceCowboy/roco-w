import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const defaultPublicDir = fileURLToPath(new URL("./public", import.meta.url));

function internalError(name) {
  return Object.assign(new Error(name), { name });
}

function linkState(record) {
  if (record.status !== "ready") return "uploading";
  if (record.revoked) return "revoked";
  // Legacy first-used timestamps and interrupted durable claims stay consumed.
  return record.firstUsedAt || record.redemptionId ? "used" : "unused";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function clientPage(message, record, token) {
  const form = record ? `<p class="download-filename" dir="auto">${escapeHtml(record.filename)}</p>
    <p>این پیوند تنها برای یک بار دانلود معتبر است. در صورت قطع دانلود، برای دریافت پیوند جدید با پشتیبانی تماس بگیرید.</p>
    <form method="post" action="/d/${encodeURIComponent(token)}/download"><button class="button primary" type="submit">دانلود ویدئو</button></form>` : "";
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><title>دانلود ویدئو | روکو</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"></head>
    <body class="download-page"><main class="card download-card"><div class="logo" aria-hidden="true">↓</div><h1>دانلود ویدئو</h1><p role="status">${escapeHtml(message)}</p>${form}</main></body></html>`;
}

const blockedMessages = {
  uploading: "فایل هنوز آمادهٔ دانلود نیست.",
  revoked: "این پیوند لغو شده است. برای دریافت پیوند جدید با پشتیبانی تماس بگیرید.",
  used: "این پیوند قبلاً استفاده شده است. برای دریافت پیوند جدید با پشتیبانی تماس بگیرید."
};

function contentDisposition(filename) {
  const clean = String(filename).replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/]/g, "_").slice(0, 180) || "video";
  const ascii = clean.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(clean).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function createApp({
  dataFile, storage, bucket, adminToken, publicBaseUrl = "", uploadUrlSeconds = 900,
  publicDir = defaultPublicDir, logger = console, signUpload = getSignedUrl,
  storageHeaderTimeoutMs = 15_000, streamIdleTimeoutMs = 60_000
}) {
  async function storageRequest(operation, command) {
    const correlationId = crypto.randomUUID();
    const startedAt = performance.now();
    try {
      const result = await storage.send(command, { abortSignal: AbortSignal.timeout(15_000) });
      logger.info("Storage request completed", {
        operation,
        correlationId,
        latencyMs: Math.round(performance.now() - startedAt),
        status: result.$metadata?.httpStatusCode
      });
      return result;
    } catch (error) {
      logger.error("Storage request failed", {
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
  app.use((_req, res, next) => {
    res.set({ "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
    next();
  });
  app.use(express.static(publicDir, { extensions: ["html"] }));

  let dbQueue = Promise.resolve();

  async function ensureDb() {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    try {
      const file = await fs.open(dataFile, "wx", 0o600);
      try { await file.writeFile(JSON.stringify({ uploads: [] })); await file.sync(); }
      finally { await file.close(); }
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }

  async function readDb() {
    const parsed = JSON.parse(await fs.readFile(dataFile, "utf8"));
    if (!Array.isArray(parsed.uploads)) throw internalError("InvalidMetadataStore");
    return parsed;
  }

  async function writeDb(db) {
    const temp = `${dataFile}.${process.pid}.tmp`;
    const file = await fs.open(temp, "w", 0o600);
    try { await file.writeFile(JSON.stringify(db, null, 2)); await file.sync(); }
    finally { await file.close(); }
    await fs.rename(temp, dataFile);
    const directory = await fs.open(path.dirname(dataFile), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  }

  function mutateDb(fn) {
    const run = dbQueue.then(async () => {
      const db = await readDb();
      const result = await fn(db);
      await writeDb(db);
      return result;
    });
    // The caller still receives the rejection; keep later requests operable.
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
    if (!safeEqual(req.get("X-Admin-Token"), adminToken)) {
      return res.status(401).json({ error: "کد دسترسی نامعتبر است." });
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
    return (publicBaseUrl || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
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
      expiresAt: null,
      linkState: linkState(u),
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
        return res.status(400).json({ error: "اندازهٔ فایل نامعتبر است." });
      }
      if (!contentType.startsWith("video/") && !/\.(mkv|avi|m4v|mp4|mov|webm)$/i.test(filename)) {
        return res.status(400).json({ error: "تنها بارگذاری فایل ویدئویی مجاز است." });
      }

      const id = crypto.randomUUID();
      const token = crypto.randomBytes(24).toString("base64url");
      const day = new Date().toISOString().slice(0, 10);
      const objectKey = `videos/${day}/${id}-${filename}`;
      // ParsPack adds its own download disposition. Storing another header on
      // the object causes Chrome to reject the response as duplicate headers.
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType
      });
      const putUrl = await signUpload(storage, command, { expiresIn: uploadUrlSeconds });

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
      if (!rec) return res.status(404).json({ error: "فایل یافت نشد." });

      const head = await storageRequest("head", new HeadObjectCommand({
        Bucket: bucket,
        Key: rec.objectKey
      }));

      if (Number(head.ContentLength) !== Number(rec.size)) {
        return res.status(409).json({ error: "اندازهٔ فایل بارگذاری‌شده با اندازهٔ اعلام‌شده مطابقت ندارد." });
      }

      const updated = await mutateDb(db2 => {
        const u = db2.uploads.find(x => x.id === req.params.id);
        if (!u) throw new Error("فایل دیگر در دسترس نیست.");
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
      if (!updated) return res.status(404).json({ error: "فایل یافت نشد." });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post("/api/uploads/:id/regenerate", requireAdmin, async (req, res, next) => {
    try {
      const updated = await mutateDb(db => {
        const u = db.uploads.find(x => x.id === req.params.id);
        if (!u) return null;
        if (u.status !== "ready") throw Object.assign(new Error("فایل هنوز آمادهٔ دانلود نیست."), { status: 409 });
        u.token = crypto.randomBytes(24).toString("base64url");
        u.firstUsedAt = null;
        delete u.redemptionId;
        u.expiresAt = null;
        u.revoked = false;
        return u;
      });
      if (!updated) return res.status(404).json({ error: "فایل یافت نشد." });
      res.json({ ok: true, upload: viewRecord(req, updated) });
    } catch (e) { next(e); }
  });

  app.delete("/api/uploads/:id", requireAdmin, async (req, res, next) => {
    try {
      const db = await readDb();
      const rec = db.uploads.find(x => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "فایل یافت نشد." });

      try {
        await storageRequest("delete", new DeleteObjectCommand({
          Bucket: bucket,
          Key: rec.objectKey
        }));
      } catch {
        return res.status(502).json({ error: "حذف فایل از فضای ذخیره‌سازی انجام نشد؛ دوباره تلاش کنید." });
      }

      await mutateDb(db2 => {
        db2.uploads = db2.uploads.filter(x => x.id !== req.params.id);
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });


  function sendClientError(res, status, message) {
    return res.status(status).type("html").send(clientPage(message));
  }

  app.get("/d/:token", async (req, res, next) => {
    try {
      if (req.get("Range")) return sendClientError(res, 416, "ادامهٔ دانلود یا دانلود بخشی از فایل پشتیبانی نمی‌شود.");
      const db = await readDb();
      const record = db.uploads.find(item => safeEqual(item.token, req.params.token));
      if (!record) return sendClientError(res, 404, "پیوند دانلود یافت نشد.");
      const state = linkState(record);
      if (state !== "unused") return sendClientError(res, state === "uploading" ? 409 : 403, blockedMessages[state]);
      return res.type("html").send(clientPage("برای آغاز دانلود، دکمهٔ زیر را انتخاب کنید.", record, req.params.token));
    } catch (error) { next(error); }
  });

  app.post("/d/:token/download", async (req, res) => {
    if (req.get("Range")) return sendClientError(res, 416, "ادامهٔ دانلود یا دانلود بخشی از فایل پشتیبانی نمی‌شود.");
    const correlationId = crypto.randomUUID();
    const startedAt = performance.now();
    const controller = new AbortController();
    let record;
    let upstream;
    let headerTimer;
    let idleTimer;
    let responseStarted = false;
    let byteCount = 0;
    const abort = () => controller.abort();
    const onClose = () => { if (!res.writableFinished) abort(); };
    req.once("aborted", abort);
    res.once("close", onClose);
    if (req.aborted || res.destroyed) abort();
    try {
      record = await mutateDb(db => {
        const item = db.uploads.find(candidate => safeEqual(candidate.token, req.params.token));
        if (!item) return null;
        const state = linkState(item);
        if (state !== "unused") return { blocked: state };
        item.firstUsedAt = new Date().toISOString();
        item.expiresAt = null;
        item.redemptionId = correlationId;
        return { ...item };
      });
      if (!record) return sendClientError(res, 404, "پیوند دانلود یافت نشد.");
      if (record.blocked) return sendClientError(res, record.blocked === "uploading" ? 409 : 403, blockedMessages[record.blocked]);
      controller.signal.throwIfAborted();
      // This timer covers only obtaining the storage response, not its body.
      headerTimer = setTimeout(abort, storageHeaderTimeoutMs);
      headerTimer.unref();
      let object;
      try {
        object = await storage.send(new GetObjectCommand({ Bucket: bucket, Key: record.objectKey }), { abortSignal: controller.signal });
      } finally { clearTimeout(headerTimer); }
      upstream = object.Body;
      // Observe errors while the durable claim is being checked, before pipeline.
      if (upstream?.on) upstream.on("error", abort);
      logger.info("Storage request completed", {
        operation: "download", correlationId, latencyMs: Math.round(performance.now() - startedAt), status: object.$metadata?.httpStatusCode
      });
      if (!upstream || typeof upstream.pipe !== "function") throw internalError("InvalidStorageBody");
      if (!Number.isSafeInteger(record.size) || record.size <= 0 || object.ContentLength !== record.size) throw internalError("StorageSizeMismatch");
      controller.signal.throwIfAborted();
      // Revoke/regenerate during the storage request must not release this file.
      const stillClaimed = await mutateDb(db => db.uploads.some(item => safeEqual(item.token, record.token) && item.redemptionId === correlationId && !item.revoked && item.status === "ready"));
      if (!stillClaimed) throw internalError("DownloadClaimChanged");
      controller.signal.throwIfAborted();
      if (upstream.destroyed) throw internalError("StorageStreamClosed");
      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(abort, streamIdleTimeoutMs);
        idleTimer.unref();
      };
      const meter = new Transform({
        transform(chunk, encoding, callback) {
          byteCount += chunk.length;
          resetIdleTimer();
          callback(null, chunk);
        },
        flush(callback) { callback(byteCount === record.size ? null : internalError("StorageStreamTruncated")); }
      });
      const contentType = /^(video\/[a-z0-9.+-]+|application\/octet-stream)$/i.test(record.contentType) ? record.contentType : "application/octet-stream";
      res.set({
        "Content-Type": contentType,
        "Content-Length": String(record.size),
        "Content-Disposition": contentDisposition(record.filename),
        "Accept-Ranges": "none"
      });
      responseStarted = true;
      res.flushHeaders();
      resetIdleTimer();
      await pipeline(upstream, meter, res, { signal: controller.signal });
      logger.info("Download completed", { correlationId, status: 200, latencyMs: Math.round(performance.now() - startedAt), byteCount });
    } catch (error) {
      clearTimeout(headerTimer);
      clearTimeout(idleTimer);
      controller.abort();
      if (upstream && !upstream.destroyed) upstream.destroy();
      logger.error("Download failed", {
        correlationId, status: responseStarted ? 200 : 502, latencyMs: Math.round(performance.now() - startedAt), byteCount,
        errorCode: error.name, responseStarted
      });
      if (!responseStarted && record && !record.blocked) {
        try {
          await mutateDb(db => {
            const item = db.uploads.find(candidate => safeEqual(candidate.token, record.token) && candidate.redemptionId === correlationId);
            if (item) { item.firstUsedAt = null; item.expiresAt = null; delete item.redemptionId; }
          });
        } catch (releaseError) {
          logger.error("Download claim release failed", { correlationId, errorCode: releaseError.name });
        }
      }
      if (!responseStarted && !res.destroyed) return sendClientError(res, 502, "آغاز دانلود انجام نشد. دوباره تلاش کنید؛ در صورت تکرار خطا با پشتیبانی تماس بگیرید.");
      if (!res.destroyed) res.destroy();
    } finally {
      clearTimeout(headerTimer);
      clearTimeout(idleTimer);
      req.removeListener("aborted", abort);
      res.removeListener("close", onClose);
    }
  });

  app.all("/d/:token/download", (_req, res) => {
    res.set("Allow", "POST");
    sendClientError(res, 405, "برای دانلود، دکمهٔ صفحهٔ پیوند را انتخاب کنید.");
  });

  // Express requires a four-argument signature for error middleware.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error, req, res, _next) => {
    const status = Number(error.status || 500);
    logger.error("Request failed", { correlationId: crypto.randomUUID(), status, errorCode: error.name });
    if (res.headersSent) { res.destroy(); return; }
    const message = status >= 500 ? "خطایی در سامانه رخ داده است. دوباره تلاش کنید." : "درخواست نامعتبر است.";
    if (req.path.startsWith("/d/")) sendClientError(res, status, message);
    else res.status(status).json({ error: message });
  });

  await ensureDb();
  await readDb();
  return app;
}
