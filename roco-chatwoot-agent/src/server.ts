import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig } from "./config.js";
import { processMessage, webhookJob } from "./bot.js";
import { verifyChatwootSignature } from "./security.js";
import type { ChatwootWebhook, Job } from "./types.js";
import { JobStore } from "./store.js";

const config = loadConfig();
const MAX_BODY_BYTES = 64 * 1024;
const DEDUPE_TTL_MS = 15 * 60_000;
const queue: Job[] = [];
const activeConversations = new Set<number>();
const store = new JobStore(config.stateFile);
for (const job of store.pending()) queue.push({ ...job, content: "" });
const seen = new Map<string, number>(queue.map((job) => [job.messageId, Date.now() + DEDUPE_TTL_MS]));
let active = 0;
let consecutiveFailures = 0;
let totalFailures = 0;
let totalRetryExhaustions = 0;

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

function pruneSeen(now: number): void {
  for (const [id, expiresAt] of seen) if (expiresAt <= now) seen.delete(id);
}

function drain(): void {
  while (active < config.maxConcurrent && queue.length) {
    const index = queue.findIndex((candidate) => !activeConversations.has(candidate.conversationId));
    if (index < 0) return;
    const [job] = queue.splice(index, 1);
    if (!job) return;
    active += 1;
    activeConversations.add(job.conversationId);
    void processMessage(config, job).then((succeeded) => {
      if (succeeded) {
        store.remove(job.messageId);
        consecutiveFailures = 0;
      }
      if (!succeeded && job.attempt < config.maxAttempts) {
        consecutiveFailures += 1;
        totalFailures += 1;
        if (consecutiveFailures >= config.alertFailureThreshold) {
          console.error(`[alert] consecutive_failures=${consecutiveFailures} threshold=${config.alertFailureThreshold}`);
        }
        const delay = config.retryBaseDelayMs * 2 ** (job.attempt - 1);
        console.warn(`[bot] message=${job.messageId} conversation=${job.conversationId} retry=${job.attempt + 1}/${config.maxAttempts} delay_ms=${delay}`);
        setTimeout(() => {
          const retry = { ...job, attempt: job.attempt + 1 };
          store.update(retry);
          queue.push(retry);
          drain();
        }, delay).unref();
      } else if (!succeeded) {
        consecutiveFailures += 1;
        totalFailures += 1;
        totalRetryExhaustions += 1;
        console.error(`[bot] message=${job.messageId} conversation=${job.conversationId} retries=exhausted`);
        console.error(`[alert] retry_exhausted_total=${totalRetryExhaustions}`);
      }
    }).finally(() => {
      active -= 1;
      activeConversations.delete(job.conversationId);
      drain();
    });
  }
}

function enqueue(job: NonNullable<ReturnType<typeof webhookJob>>): boolean {
  const now = Date.now();
  pruneSeen(now);
  if (seen.has(job.messageId)) return true;
  if (queue.length >= config.queueLimit) return false;
  seen.set(job.messageId, now + DEDUPE_TTL_MS);
  const queued = { ...job, attempt: 1 };
  store.add(queued);
  queue.push(queued);
  drain();
  return true;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    json(response, 200, {
      ok: true,
      active,
      active_conversations: activeConversations.size,
      queued: queue.length,
      consecutive_failures: consecutiveFailures,
      total_failures: totalFailures,
      retry_exhaustions: totalRetryExhaustions,
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
  } catch {
    json(response, 400, { ok: false });
    return;
  }

  const job = webhookJob(payload, config);
  if (!job) {
    json(response, 200, { ok: true, ignored: true });
    return;
  }
  if (!enqueue(job)) {
    console.error(`[webhook] conversation=${job.conversationId} queue=full`);
    json(response, 503, { ok: false });
    return;
  }

  // Acknowledge before model work so Chatwoot does not retry a slow AI request.
  json(response, 202, { ok: true });
});

server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.listen(config.port, config.host, () => {
  console.info(`[server] listening on http://${config.host}:${config.port}`);
});

function shutdown(signal: string): void {
  console.info(`[server] received ${signal}, shutting down`);
  server.close((error) => {
    if (error) {
      console.error("[server] shutdown failed:", error.message);
      process.exitCode = 1;
    }
  });
  setTimeout(() => process.exit(1), 15_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
