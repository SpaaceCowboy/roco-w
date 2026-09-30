import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { transpileModule, ModuleKind } from "typescript";

test("browser upload grants sign metadata only as a header and omit empty-body checksums", async () => {
  const require = createRequire(import.meta.url);
  const mocks: Record<string, unknown> = {
    "server-only": {}, "@/db/client": {}, "@/db/schema": {},
    "./permissions": { requireAdminPermission: () => {} }, "./observability": {},
  };
  const storageModule = { exports: {} as { createMediaUpload: (input: unknown, session: unknown) => Promise<{ uploadUrl: string; requiredHeaders: Record<string, string> }> } };
  const code = transpileModule(readFileSync(new URL("./media-storage.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    exports: storageModule.exports, require: (name: string) => mocks[name] ?? require(name),
    Buffer, URL, crypto: webcrypto, performance,
    process: { env: {
      CONTENT_MEDIA_S3_ENDPOINT: "https://storage.invalid", CONTENT_MEDIA_S3_ACCESS_KEY_ID: "test",
      CONTENT_MEDIA_S3_SECRET_ACCESS_KEY: "test", CONTENT_MEDIA_S3_BUCKET: "test",
      CONTENT_MEDIA_PUBLIC_BASE_URL: "https://media.invalid", ADMIN_AUTH_SECRET: "a".repeat(32),
    } },
  });
  const checksum = "a".repeat(64);
  const grant = await storageModule.exports.createMediaUpload({
    filename: "image.png", mimeType: "image/png", byteSize: 73664, checksumSha256: checksum,
  }, { role: "editor", userId: "test" });
  const url = new URL(grant.uploadUrl);
  assert.equal(url.searchParams.has("x-amz-checksum-crc32"), false);
  assert.equal(url.searchParams.has("x-amz-sdk-checksum-algorithm"), false);
  assert.equal(url.searchParams.has("x-amz-meta-sha256"), false);
  assert.ok(url.searchParams.get("X-Amz-SignedHeaders")?.split(";").includes("x-amz-meta-sha256"));
  assert.equal(grant.requiredHeaders["x-amz-meta-sha256"], checksum);
  assert.equal(grant.requiredHeaders["content-type"], "image/png");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
});

// Exercise the real storage function with local DB/S3 doubles; no credentials or network.
test("trusted imports use immutable keys and never delete an object after a refused overwrite", async () => {
  const objects = new Map<string, Buffer>();
  const commands: Array<{ kind: string; input: Record<string, unknown> }> = [];
  const rows: Array<Record<string, unknown>> = [];
  let failInsert = false;
  class PutObjectCommand { constructor(public input: Record<string, unknown>) {} }
  class DeleteObjectCommand { constructor(public input: Record<string, unknown>) {} }
  class S3Client {
    async send(command: PutObjectCommand | DeleteObjectCommand) {
      const { input } = command;
      commands.push({ kind: command.constructor.name, input });
      const key = input.Key as string;
      if (command instanceof PutObjectCommand) {
        assert.equal(input.IfNoneMatch, "*");
        if (objects.has(key)) throw new Error("PreconditionFailed");
        objects.set(key, input.Body as Buffer);
      } else objects.delete(key);
    }
  }
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({ values: (value: Record<string, unknown>) => ({ returning: async () => {
      if (failInsert) throw new Error("DB failure");
      rows.push(value); return [value];
    } }) }),
  };
  const require = createRequire(import.meta.url);
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "@aws-sdk/client-s3": { S3Client, PutObjectCommand, DeleteObjectCommand },
    "@/db/client": { getDatabase: () => db },
    "@/db/schema": { media: {} },
    "drizzle-orm": { and: () => true, eq: () => true, isNull: () => true },
    sharp: () => ({ metadata: async () => ({ format: "png", width: 10, height: 10 }) }),
    "./permissions": {},
    "./observability": { adminEvents: {}, reportAdminSuccess: () => {}, reportAdminFailure: () => {} },
  };
  const storageModule = { exports: {} as { importTrustedMedia: (input: { bytes: Buffer; filename: string; mimeType: "image/png" }) => Promise<Record<string, unknown>> } };
  const code = transpileModule(readFileSync(new URL("./media-storage.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    module: storageModule, exports: storageModule.exports, require: (name: string) => mocks[name] ?? require(name),
    Buffer, URL, crypto: webcrypto, performance,
    process: { env: {
      CONTENT_MEDIA_S3_ENDPOINT: "https://storage.invalid", CONTENT_MEDIA_S3_ACCESS_KEY_ID: "test",
      CONTENT_MEDIA_S3_SECRET_ACCESS_KEY: "test", CONTENT_MEDIA_S3_BUCKET: "test",
      CONTENT_MEDIA_PUBLIC_BASE_URL: "https://media.invalid",
    } },
  });
  const input = { bytes: Buffer.from("original"), filename: "same.png", mimeType: "image/png" as const };
  const original = await storageModule.exports.importTrustedMedia(input);
  const changed = await storageModule.exports.importTrustedMedia({ ...input, bytes: Buffer.from("changed") });
  assert.notEqual(original.storageKey, changed.storageKey);
  // Force a stale DB lookup: conditional S3 creation must still protect the live object.
  await assert.rejects(storageModule.exports.importTrustedMedia(input), /PreconditionFailed/);
  assert.equal(objects.get(original.storageKey as string)?.toString(), "original");
  assert.equal(commands.filter((command) => command.kind === "DeleteObjectCommand").length, 0);
  failInsert = true;
  await assert.rejects(storageModule.exports.importTrustedMedia({ ...input, bytes: Buffer.from("new") }), /DB failure/);
  assert.equal(objects.size, 2);
  assert.equal(rows.length, 2);
});
