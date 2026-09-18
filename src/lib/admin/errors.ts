/** Typed admin API errors. Kept free of `server-only` so they are unit-testable. */

export class AdminApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

export class RateLimitExceededError extends AdminApiError {
  constructor(readonly retryAfterSeconds: number) {
    super(429, "Too many requests");
    this.name = "RateLimitExceededError";
  }
}
