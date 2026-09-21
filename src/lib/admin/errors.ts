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

export type ContentDeletionCode = "published_requires_archive" | "forbidden";

/**
 * A deletion refused by content state or ownership. Kept free of `server-only`
 * so the policy and its mapping stay unit-testable.
 */
export class ContentDeletionError extends Error {
  constructor(readonly code: ContentDeletionCode, message: string) {
    super(message);
    this.name = "ContentDeletionError";
  }
}
