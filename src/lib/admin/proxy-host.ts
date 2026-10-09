/** Apache appends its own host after the value pinned by the SCC proxy. */
export function firstForwardedValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}
