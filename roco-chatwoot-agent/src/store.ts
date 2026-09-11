import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Job } from "./types.js";

type StoredJob = Omit<Job, "content">;

export class JobStore {
  private jobs = new Map<string, StoredJob>();

  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as StoredJob[];
      for (const job of parsed) this.jobs.set(job.messageId, job);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  pending(): StoredJob[] {
    return [...this.jobs.values()];
  }

  add(job: Job): void {
    this.jobs.set(job.messageId, {
      messageId: job.messageId,
      conversationId: job.conversationId,
      contactId: job.contactId,
      attempt: job.attempt,
    });
    this.flush();
  }

  update(job: Job): void {
    this.add(job);
  }

  remove(messageId: string): void {
    if (!this.jobs.delete(messageId)) return;
    this.flush();
  }

  private flush(): void {
    const temporaryPath = `${this.path}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(this.pending())}\n`, { mode: 0o600 });
    renameSync(temporaryPath, this.path);
  }
}
