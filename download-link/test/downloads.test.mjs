import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, PassThrough } from "node:stream";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { createApp } from "../app.js";

const token = "synthetic-client-token";
const admin = "synthetic-admin-token";
function record(overrides = {}) {
  return { id: "synthetic-upload-id", token, filename: "آموزش MT5.mp4", objectKey: "synthetic-object-key", size: 4, contentType: "video/mp4", status: "ready", createdAt: "2026-01-01T00:00:00Z", firstUsedAt: null, expiresAt: null, revoked: false, ...overrides };
}
async function fixture(t, { rows = [record()], get, dataFile, headerTimeout = 1000, idleTimeout = 1000 } = {}) {
  const directory = dataFile ? null : await fs.mkdtemp(path.join(os.tmpdir(), "roco-download-test-"));
  dataFile ||= path.join(directory, "uploads.json");
  if (directory) await fs.writeFile(dataFile, JSON.stringify({ uploads: rows }));
  const logs = [];
  let getCalls = 0;
  const storage = { async send(command, options) {
    if (command.constructor.name === "GetObjectCommand") {
      getCalls++;
      return get ? get(command, options) : { Body: Readable.from([Buffer.from("test")]), ContentLength: 4, ContentDisposition: "upstream-header-must-not-be-forwarded", $metadata: { httpStatusCode: 200 } };
    }
    if (command.constructor.name === "HeadObjectCommand") return { ContentLength: 4 };
    return {};
  } };
  const app = await createApp({ dataFile, storage, bucket: "synthetic-bucket", adminToken: admin, publicBaseUrl: "https://support-downloads.example.invalid", logger: { info: (...args) => logs.push(args), error: (...args) => logs.push(args) }, storageHeaderTimeoutMs: headerTimeout, streamIdleTimeoutMs: idleTimeout,
    signUpload: async (_storage, command) => { assert.equal(command.input.ContentDisposition, undefined); return "https://upload.example.invalid/synthetic"; } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); };
  t.after(async () => { await close(); if (directory) await fs.rm(directory, { recursive: true, force: true }); });
  return {
    base, dataFile, logs, close, getCalls: () => getCalls,
    state: async () => JSON.parse(await fs.readFile(dataFile, "utf8")).uploads,
    request: (url = `/d/${token}`, options = {}) => fetch(base + url, { redirect: "manual", ...options }),
    adminRequest: (url, options = {}) => fetch(base + url, { ...options, headers: { "X-Admin-Token": admin, "Content-Type": "application/json", ...options.headers } })
  };
}

test("opening, previewing and HEAD never consume a link or expose storage URLs", async t => {
  const f = await fixture(t);
  for (const method of ["GET", "GET", "HEAD"]) {
    const response = await f.request(undefined, { method });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const body = await response.text();
    if (method === "GET") { assert.match(body, /دانلود ویدئو/); assert.match(body, /method="post"/); assert.doesNotMatch(body, /X-Amz|parspack|storage\.example/); }
    else assert.equal(body, "");
  }
  assert.equal((await f.state())[0].firstUsedAt, null);
  assert.equal(f.getCalls(), 0);
});

test("exactly one concurrent POST wins; repeats are forbidden", async t => {
  const f = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 8 }, () => f.request(`/d/${token}/download`, { method: "POST" })));
  assert.equal(responses.filter(response => response.status === 200).length, 1);
  assert.equal(responses.filter(response => response.status === 403).length, 7);
  assert.equal(await responses.find(response => response.status === 200).text(), "test");
  for (const response of responses.filter(response => response.status !== 200)) await response.text();
  assert.equal(f.getCalls(), 1);
  assert.ok((await f.state())[0].firstUsedAt);
  const repeat = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(repeat.status, 403);
  assert.match(await repeat.text(), /قبلاً استفاده/);
});

test("stream sets one disposition with Persian filename and never redirects", async t => {
  const f = await fixture(t);
  const result = await new Promise((resolve, reject) => {
    const request = http.request(`${f.base}/d/${token}/download`, { method: "POST" }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => resolve({ response, body: Buffer.concat(chunks).toString() }));
    });
    request.on("error", reject); request.end();
  });
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.response.rawHeaders.filter(value => value.toLowerCase() === "content-disposition").length, 1);
  assert.match(result.response.headers["content-disposition"], /filename\*=UTF-8''/);
  assert.match(result.response.headers["content-disposition"], new RegExp(encodeURIComponent("آموزش")));
  assert.doesNotMatch(result.response.headers["content-disposition"], /upstream/);
  assert.equal(result.response.headers.location, undefined);
  assert.equal(result.response.headers["accept-ranges"], "none");
  assert.equal(result.body, "test");
  const serialized = JSON.stringify(f.logs);
  for (const privateValue of [token, admin, record().filename, record().objectKey]) assert.equal(serialized.includes(privateValue), false);
  assert.match(serialized, /byteCount/);
});

test("consumption persists across application restarts", async t => {
  const f = await fixture(t);
  await (await f.request(`/d/${token}/download`, { method: "POST" })).text();
  await f.close();
  const restarted = await fixture(t, { dataFile: f.dataFile });
  const response = await restarted.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 403);
  assert.equal(restarted.getCalls(), 0);
});

test("legacy used records and interrupted durable claims remain consumed", async t => {
  const rows = [record({ token: "legacy-used", firstUsedAt: "2026-01-01T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z" }), record({ token: "crash-claim", redemptionId: "synthetic-redemption" })];
  const f = await fixture(t, { rows });
  for (const value of ["legacy-used", "crash-claim"]) assert.equal((await f.request(`/d/${value}/download`, { method: "POST" })).status, 403);
  const response = await f.adminRequest("/api/uploads");
  const body = await response.json();
  assert.ok(body.uploads.every(upload => upload.linkState === "used" && upload.expiresAt === null));
  assert.ok(body.uploads.every(upload => !("redemptionId" in upload)));
});

test("HEAD and range/resume requests cannot claim a link", async t => {
  const f = await fixture(t);
  assert.equal((await f.request(`/d/${token}/download`, { method: "HEAD" })).status, 405);
  assert.equal((await f.request(`/d/${token}/download`, { method: "POST", headers: { Range: "bytes=0-1" } })).status, 416);
  assert.equal((await f.request(undefined, { headers: { Range: "bytes=0-1" } })).status, 416);
  assert.equal((await f.state())[0].firstUsedAt, null);
  assert.equal(f.getCalls(), 0);
});

test("storage failure before response releases the claim for retry", async t => {
  let fail = true;
  const f = await fixture(t, { get: async () => {
    if (fail) { fail = false; throw Object.assign(new Error("synthetic failure"), { name: "SyntheticStorageError" }); }
    return { Body: Readable.from([Buffer.from("test")]), ContentLength: 4 };
  } });
  const failed = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(failed.status, 502); await failed.text();
  const state = (await f.state())[0];
  assert.equal(state.firstUsedAt, null); assert.equal(state.redemptionId, undefined);
  assert.equal(await (await f.request(`/d/${token}/download`, { method: "POST" })).text(), "test");
});

test("storage response timeout releases claim and cancels upstream", async t => {
  let aborted = false;
  const f = await fixture(t, { headerTimeout: 25, get: (_command, { abortSignal }) => new Promise((_resolve, reject) => {
    abortSignal.addEventListener("abort", () => { aborted = true; reject(new Error("synthetic timeout")); }, { once: true });
  }) });
  const response = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 502); await response.text();
  assert.equal(aborted, true);
  assert.equal((await f.state())[0].firstUsedAt, null);
});

test("slow active download outlives response timeout without total duration limit", async t => {
  const f = await fixture(t, { headerTimeout: 10, idleTimeout: 80, rows: [record({ size: 10 })], get: async () => ({ ContentLength: 10, Body: Readable.from((async function* () {
    for (let index = 0; index < 5; index++) { await delay(15); yield Buffer.from("ab"); }
  })()) }) });
  const response = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ababababab");
});

test("idle or broken streams stay consumed after headers start", async t => {
  const f = await fixture(t, { idleTimeout: 25, get: async () => ({ ContentLength: 4, Body: new Readable({ read() {} }) }) });
  const response = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 200);
  await assert.rejects(response.text());
  assert.ok((await f.state())[0].firstUsedAt);
  assert.equal((await f.request(`/d/${token}/download`, { method: "POST" })).status, 403);
});

test("client disconnect aborts upstream and leaves the link consumed", async t => {
  let upstreamSignal;
  const stream = new PassThrough();
  const f = await fixture(t, { rows: [record({ size: 8 })], get: async (_command, { abortSignal }) => {
    upstreamSignal = abortSignal;
    stream.write(Buffer.from("test"));
    return { Body: stream, ContentLength: 8 };
  } });
  const client = new AbortController();
  const response = await f.request(`/d/${token}/download`, { method: "POST", signal: client.signal });
  await response.body.getReader().read();
  client.abort();
  for (let index = 0; index < 50 && !upstreamSignal.aborted; index++) await delay(5);
  assert.equal(upstreamSignal.aborted, true);
  assert.ok((await f.state())[0].firstUsedAt);
  assert.equal((await f.request(`/d/${token}/download`, { method: "POST" })).status, 403);
});

test("regeneration invalidates old token and resets one attempt; revocation blocks", async t => {
  const f = await fixture(t, { rows: [record({ firstUsedAt: "2026-01-01T00:00:00Z", redemptionId: "old-claim" })] });
  const regenerated = await f.adminRequest("/api/uploads/synthetic-upload-id/regenerate", { method: "POST" });
  const { upload } = await regenerated.json();
  assert.equal(upload.linkState, "unused");
  assert.equal(upload.firstUsedAt, null);
  assert.equal((await f.request(`/d/${token}/download`, { method: "POST" })).status, 404);
  const nextToken = new URL(upload.downloadUrl).pathname.split("/").pop();
  assert.equal((await f.request(`/d/${nextToken}`)).status, 200);
  await f.adminRequest("/api/uploads/synthetic-upload-id/revoke", { method: "POST" });
  assert.equal((await f.request(`/d/${nextToken}/download`, { method: "POST" })).status, 403);
  assert.equal(f.getCalls(), 0);
});

test("regeneration during failed storage request is not undone by claim release", async t => {
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  let rejectGet;
  const f = await fixture(t, { get: () => { started(); return new Promise((_resolve, reject) => { rejectGet = reject; }); } });
  const inFlight = f.request(`/d/${token}/download`, { method: "POST" });
  await ready;
  const response = await f.adminRequest("/api/uploads/synthetic-upload-id/regenerate", { method: "POST" });
  const { upload } = await response.json();
  rejectGet(new Error("synthetic failure"));
  assert.equal((await inFlight).status, 502);
  const state = (await f.state())[0];
  assert.equal(state.firstUsedAt, null);
  assert.equal(state.redemptionId, undefined);
  assert.equal(upload.downloadUrl.endsWith(state.token), true);
});

test("admin auth and uploads still work without storing disposition metadata", async t => {
  const f = await fixture(t, { rows: [] });
  assert.equal((await f.request("/api/uploads")).status, 401);
  const response = await f.adminRequest("/api/uploads/init", { method: "POST", body: JSON.stringify({ filename: "ویدئو.mp4", contentType: "video/mp4", size: 4 }) });
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.deepEqual(data.putHeaders, { "Content-Type": "video/mp4" });
  const completed = await f.adminRequest(`/api/uploads/${data.id}/complete`, { method: "POST" });
  assert.equal((await completed.json()).upload.linkState, "unused");
});

test("size mismatch before response releases claim and destroys body", async t => {
  const body = Readable.from([Buffer.from("test")]);
  const f = await fixture(t, { get: async () => ({ Body: body, ContentLength: 8 }) });
  const response = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 502); await response.text();
  assert.equal(body.destroyed, true);
  assert.equal((await f.state())[0].firstUsedAt, null);
  assert.ok(JSON.stringify(f.logs).includes("StorageSizeMismatch"));
});

test("body failure during claim validation releases claim before response", async t => {
  const f = await fixture(t, { get: async () => {
    const body = new PassThrough();
    setImmediate(() => body.destroy(new Error("synthetic early stream failure")));
    return { Body: body, ContentLength: 4 };
  } });
  const response = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 502); await response.text();
  assert.equal((await f.state())[0].firstUsedAt, null);
});

test("truncated stream stays used and reports safe outcome", async t => {
  const f = await fixture(t, { get: async () => ({ Body: Readable.from([Buffer.from("ab")]), ContentLength: 4 }) });
  const response = await f.request(`/d/${token}/download`, { method: "POST" });
  assert.equal(response.status, 200);
  await assert.rejects(response.text());
  assert.ok((await f.state())[0].firstUsedAt);
  assert.ok(JSON.stringify(f.logs).includes("StorageStreamTruncated"));
});

test("revocation while obtaining storage response prevents streaming", async t => {
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  let resolveGet;
  const f = await fixture(t, { get: () => { started(); return new Promise(resolve => { resolveGet = resolve; }); } });
  const pending = f.request(`/d/${token}/download`, { method: "POST" });
  await ready;
  await f.adminRequest("/api/uploads/synthetic-upload-id/revoke", { method: "POST" });
  resolveGet({ Body: Readable.from([Buffer.from("test")]), ContentLength: 4 });
  const response = await pending;
  assert.equal(response.status, 502); await response.text();
  const state = (await f.state())[0];
  assert.equal(state.revoked, true);
  assert.equal(state.firstUsedAt, null);
  assert.equal((await f.request(`/d/${token}/download`, { method: "POST" })).status, 403);
});

test("confirmation page escapes filenames instead of injecting markup", async t => {
  const f = await fixture(t, { rows: [record({ filename: '<script>alert("synthetic")</script>.mp4' })] });
  const html = await (await f.request()).text();
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("missing, unready and revoked links return localized errors without storage requests", async t => {
  const f = await fixture(t, { rows: [record({ token: "not-ready", status: "uploading" }), record({ token: "revoked", revoked: true })] });
  for (const [value, status] of [["missing", 404], ["not-ready", 409], ["revoked", 403]]) {
    const response = await f.request(`/d/${value}/download`, { method: "POST" });
    assert.equal(response.status, status);
    assert.match(await response.text(), /lang="fa" dir="rtl"/);
  }
  assert.equal(f.getCalls(), 0);
});

test("corrupt metadata fails startup instead of silently reopening links", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "roco-corrupt-store-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const dataFile = path.join(directory, "uploads.json");
  await fs.writeFile(dataFile, '{"invalid":true}');
  await assert.rejects(createApp({ dataFile, storage: {}, bucket: "synthetic", adminToken: admin }), { name: "InvalidMetadataStore" });
});
