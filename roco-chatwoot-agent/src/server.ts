import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig } from "./config.js";
import { processMessage, webhookJob } from "./bot.js";
import { verifyChatwootSignature } from "./security.js";
import type { ChatwootWebhook } from "./types.js";
import { JobStore } from "./store.js";
import { JobQueue } from "./queue.js";
import { errorCode } from "./errors.js";
import { isBotAvailable } from "./availability.js";
import { metrics } from "./metrics.js";

const config = loadConfig();
const MAX_BODY_BYTES = 64 * 1024;
const store = new JobStore(config.stateFile, config.maxAttempts);
const queue = new JobQueue(config, store, processMessage);

function json(response: ServerResponse, status: number, body: object): void {
  const value = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(value),
    "Cache-Control": "no-store",
  });
  response.end(value);
}

async function rawBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new Error("body_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    console.error(`[server] request=failed code=${errorCode(error)}`);
    if (!response.headersSent) json(response, 503, { ok: false });
    else response.end();
  });
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    const snapshot = queue.snapshot();
    json(response, snapshot.accepting ? 200 : 503, {
      ok: snapshot.accepting,
      ...snapshot,
      ...metrics,
      bot_availability: { ...config.availability, available: isBotAvailable(config.availability) },
    });
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/webhooks/chatwoot") {
    json(response, 404, { ok: false });
    return;
  }

  let body: string;
  try {
    body = await rawBody(request);
  } catch (error) {
    json(response, error instanceof Error && error.message === "body_too_large" ? 413 : 400, { ok: false });
    return;
  }

  const valid = verifyChatwootSignature({
    rawBody: body,
    timestamp: request.headers["x-chatwoot-timestamp"] as string | undefined,
    signature: request.headers["x-chatwoot-signature"] as string | undefined,
    secret: config.webhookSecret,
    maxAgeSeconds: config.webhookMaxAgeSeconds,
  });
  if (!valid) {
    console.warn("[webhook] rejected invalid or stale signature");
    json(response, 401, { ok: false });
    return;
  }

  let payload: ChatwootWebhook;
  try {
    payload = JSON.parse(body) as ChatwootWebhook;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid_webhook");
  } catch {
    json(response, 400, { ok: false });
    return;
  }

  const job = webhookJob(payload, config);
  if (!job) {
    json(response, 200, { ok: true, ignored: true });
    return;
  }
  if (!queue.enqueue({ ...job, outsideHours: !isBotAvailable(config.availability) })) {
    console.error(`[webhook] conversation=${job.conversationId} queue=full`);
    json(response, 503, { ok: false });
    return;
  }

  // Acknowledge before model work so Chatwoot does not retry a slow AI request.
  json(response, 202, { ok: true });
}

server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.listen(config.port, config.host, () => {
  queue.start();
  console.info(`[server] listening on http://${config.host}:${config.port}`);
});

function shutdown(signal: string): void {
  console.info(`[server] received ${signal}, shutting down`);
  queue.stop();
  server.close((error) => {
    if (error) {
      console.error(`[server] shutdown=failed code=${errorCode(error)}`);
      process.exitCode = 1;
    }
  });
  setTimeout(() => process.exit(1), 15_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
