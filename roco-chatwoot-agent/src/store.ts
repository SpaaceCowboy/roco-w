import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Job } from "./types.js";
import { decisionReasons } from "./types.js";
import { ServiceError } from "./errors.js";

type StoredJob = Omit<Job, "content">;
const phases = ["queued", "reply_pending", "reply_delivered", "handoff_pending", "handoff_confirmed", "failed"];

export class JobStore {
  private jobs = new Map<string, StoredJob>();

  constructor(private readonly path: string, maxAttempts = 3) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(path, "utf8")); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw new ServiceError("store_unreadable", false);
    }
    if (!Array.isArray(parsed)) throw new ServiceError("store_invalid_state", false);
    for (const value of parsed) {
      if (!value || typeof value !== "object") throw new ServiceError("store_invalid_job", false);
      const job = value as StoredJob;
      if (!Number.isSafeInteger(Number(job.messageId)) || Number(job.messageId) < 1 ||
        !Number.isSafeInteger(job.conversationId) || job.conversationId < 1 || typeof job.contactId !== "string" || !/^(?:[0-9]+|unknown)$/.test(job.contactId) ||
        !Number.isInteger(job.attempt) || job.attempt < 1 ||
        (job.phase !== undefined && !phases.includes(job.phase)) ||
        (job.decisionAction !== undefined && !["reply", "clarify", "handoff"].includes(job.decisionAction)) ||
        (job.reason !== undefined && job.reason !== "outside_bot_hours" && !decisionReasons.includes(job.reason)) ||
        (job.language !== undefined && !["fa", "ar", "zh", "ru", "de", "en"].includes(job.language)) ||
        (job.outsideHours !== undefined && typeof job.outsideHours !== "boolean") ||
        (job.retryable !== undefined && typeof job.retryable !== "boolean") ||
        (job.nextAttemptAt !== undefined && (!Number.isFinite(job.nextAttemptAt) || job.nextAttemptAt < 0))) {
        throw new ServiceError("store_invalid_job", false);
      }
      // Legacy records at the retry limit cannot distinguish in-flight from
      // exhausted jobs. Retain them for manual review instead of looping.
      const phase = job.phase ?? (job.attempt >= maxAttempts ? "failed" : "queued");
      this.jobs.set(String(job.messageId), this.snapshot({ ...job, messageId: String(job.messageId), phase, content: "" }));
    }
    this.flush(this.jobs);
  }

  pending(): StoredJob[] { return this.records().filter((job) => job.phase !== "failed"); }
  records(): StoredJob[] { return [...this.jobs.values()].map((job) => ({ ...job })); }
  has(messageId: string): boolean { return this.jobs.has(messageId); }
  failedCount(): number { return this.records().filter((job) => job.phase === "failed").length; }

  add(job: Job): void {
    const next = new Map(this.jobs);
    next.set(job.messageId, this.snapshot(job));
    this.flush(next);
    this.jobs = next;
  }
  update(job: Job): void { this.add(job); }
  remove(messageId: string): void {
    if (!this.jobs.has(messageId)) return;
    const next = new Map(this.jobs);
    next.delete(messageId);
    this.flush(next);
    this.jobs = next;
  }

  private snapshot(job: Job): StoredJob {
    // Explicit allowlist: customer/model content must never enter the state file.
    return {
      messageId: job.messageId, conversationId: job.conversationId, contactId: job.contactId,
      attempt: job.attempt, phase: job.phase ?? "queued",
      ...(job.decisionAction === undefined ? {} : { decisionAction: job.decisionAction }),
      ...(job.reason === undefined ? {} : { reason: job.reason }),
      ...(job.outsideHours === undefined ? {} : { outsideHours: job.outsideHours }),
      ...(job.language === undefined ? {} : { language: job.language }),
      ...(job.nextAttemptAt === undefined ? {} : { nextAttemptAt: job.nextAttemptAt }),
      ...(job.retryable === undefined ? {} : { retryable: job.retryable }),
      // Failure codes are local classifications, never vendor messages.
      ...(job.failureCode === undefined ? {} : { failureCode: /^[a-z0-9_]{1,80}$/.test(job.failureCode) ? job.failureCode : "internal_error" }),
    };
  }

  private flush(jobs: Map<string, StoredJob>): void {
    const temporaryPath = `${this.path}.tmp`;
    const descriptor = openSync(temporaryPath, "w", 0o600);
    try { writeFileSync(descriptor, `${JSON.stringify([...jobs.values()])}\n`); fsyncSync(descriptor); }
    finally { closeSync(descriptor); }
    renameSync(temporaryPath, this.path);
    const directory = openSync(dirname(this.path), "r");
    try { fsyncSync(directory); } finally { closeSync(directory); }
  }
}
