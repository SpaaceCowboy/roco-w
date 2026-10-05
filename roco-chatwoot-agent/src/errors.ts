/** Codes are owned by this service. Never log vendor/customer error messages. */
export class ServiceError extends Error {
  constructor(public readonly code: string, public readonly retryable = true) {
    super(code);
    this.name = "ServiceError";
  }
}

export function errorCode(error: unknown): string {
  if (error instanceof ServiceError) return error.code;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "timeout";
  if (error instanceof SyntaxError) return "invalid_json";
  return "internal_error";
}
