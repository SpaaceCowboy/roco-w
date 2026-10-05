import type { Config } from "./config.js";
import type { Job } from "./types.js";
import { JobStore } from "./store.js";
import { errorCode } from "./errors.js";

type Processor = (config: Config, job: Job, persist: (job: Job) => void) => Promise<boolean>;

/** Single-process FIFO per conversation, including time spent in retry backoff. */
export class JobQueue {
  private queue: Job[];
  private activeConversations = new Set<number>();
  private wakeup: ReturnType<typeof setTimeout> | undefined;
  private stopping = false;
  private consecutiveFailures = 0;
  private totalFailures = 0;
  private retryExhaustions = 0;
  private seen = new Map<string, number>();

  constructor(private readonly config: Config, private readonly store: JobStore, private readonly processor: Processor, private readonly onFatal: () => void = () => { process.exit(1); }) {
    this.queue = store.pending().map((job) => ({ ...job, content: "" }));
    // Recover in message order, including jobs that were active during a crash.
    this.queue.sort((a, b) => Number(a.messageId) - Number(b.messageId));
  }

  start(): void { this.drain(); }
  stop(): void { this.stopping = true; if (this.wakeup) clearTimeout(this.wakeup); }
  snapshot() {
    return { accepting: !this.stopping, active: this.activeConversations.size, active_conversations: this.activeConversations.size,
      queued: this.queue.length, consecutive_failures: this.consecutiveFailures, total_failures: this.totalFailures,
      retry_exhaustions: this.retryExhaustions, failed_jobs: this.store.failedCount() };
  }

  enqueue(job: Omit<Job, "attempt">): boolean {
    const now = Date.now();
    for (const [id, expiry] of this.seen) if (expiry <= now) this.seen.delete(id);
    if (this.store.has(job.messageId) || this.seen.has(job.messageId)) return true;
    if (this.stopping || this.queue.length + this.activeConversations.size >= this.config.queueLimit) return false;
    const queued: Job = { ...job, attempt: 1, phase: "queued" };
    // Persist before acknowledging receipt or exposing it to the worker.
    this.store.add(queued);
    this.seen.set(job.messageId, now + 15 * 60_000);
    this.queue.push(queued);
    this.drain();
    return true;
  }

  private drain(): void {
    if (this.stopping) return;
    if (this.wakeup) { clearTimeout(this.wakeup); this.wakeup = undefined; }
    const now = Date.now();
    let earliest = Infinity;
    const blocked = new Set(this.activeConversations);
    for (let index = 0; index < this.queue.length && this.activeConversations.size < this.config.maxConcurrent;) {
      const job = this.queue[index]!;
      if (blocked.has(job.conversationId)) { index += 1; continue; }
      blocked.add(job.conversationId);
      if ((job.nextAttemptAt ?? 0) > now) {
        earliest = Math.min(earliest, job.nextAttemptAt!);
        index += 1;
        continue;
      }
      this.queue.splice(index, 1);
      this.activeConversations.add(job.conversationId);
      void this.run(job);
    }
    if (Number.isFinite(earliest)) this.wakeup = setTimeout(() => this.drain(), Math.max(1, earliest - Date.now()));
  }

  private async run(job: Job): Promise<void> {
    try {
      let succeeded: boolean;
      try { succeeded = await this.processor(this.config, job, (updated) => this.store.update(updated)); }
      catch (error) { job.failureCode = errorCode(error); succeeded = false; }
      if (succeeded) {
        this.store.remove(job.messageId);
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures += 1;
        this.totalFailures += 1;
        if (this.consecutiveFailures >= this.config.alertFailureThreshold) {
          console.error(`[alert] consecutive_failures=${this.consecutiveFailures}`);
        }
        if (job.retryable !== false && job.attempt < this.config.maxAttempts) {
          const delay = this.config.retryBaseDelayMs * 2 ** (job.attempt - 1);
          job.attempt += 1;
          job.nextAttemptAt = Date.now() + delay;
          this.store.update(job);
          // Keep this failed job ahead of later jobs in its conversation.
          this.queue.unshift(job);
          console.warn(`[bot] message=${job.messageId} conversation=${job.conversationId} retry=${job.attempt}/${this.config.maxAttempts} delay_ms=${delay}`);
        } else {
          job.phase = "failed";
          this.store.update(job);
          if (job.attempt >= this.config.maxAttempts) this.retryExhaustions += 1;
          console.error(`[alert] message=${job.messageId} conversation=${job.conversationId} terminal_reason=${job.retryable === false ? "nonretryable" : "retry_exhausted"} code=${job.failureCode ?? "internal_error"}`);
        }
      }
    } catch (error) {
      // Persistence failure invalidates safe acknowledgement/recovery. Stop
      // scheduling; keep durable records and let the service manager restart.
      this.stop();
      console.error(`[alert] queue=stopped code=${errorCode(error)}`);
      this.onFatal();
    } finally {
      this.activeConversations.delete(job.conversationId);
      this.drain();
    }
  }
}
