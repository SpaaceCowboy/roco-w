/**
 * Session-expiry policy, kept free of `server-only` so it is unit-testable.
 *
 * A session that is present but past its expiry must be treated as
 * unauthenticated. The database row may still exist until Better Auth sweeps
 * it, so callers cannot rely on lookup alone.
 */
export type ExpiringSession = { expiresAt: Date };

export function isSessionActive<T extends ExpiringSession>(
  session: T | null | undefined,
  now: Date = new Date(),
): session is T {
  return Boolean(session) && session!.expiresAt.getTime() > now.getTime();
}
