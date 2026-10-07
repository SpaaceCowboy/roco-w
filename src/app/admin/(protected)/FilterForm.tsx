"use client";

import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Compares non-empty query fields, ignoring order; empty filters are equivalent to absent ones. */
function sameQuery(data: FormData, current: URLSearchParams): boolean {
  const normalize = (entries: Iterable<[string, FormDataEntryValue | string]>) =>
    [...entries].filter(([, value]) => typeof value === "string" && value !== "").map(([key, value]) => `${key}=${value}`).sort().join("&");
  return normalize(data.entries()) === normalize(current.entries());
}

/**
 * GET form with client-side navigation (keeps focus while live-searching).
 * `aria-busy` is set on submit and cleared once the new search params land;
 * CSS dims the stale results meanwhile.
 */
export function FilterForm({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const params = useSearchParams();

  useEffect(() => { ref.current?.removeAttribute("aria-busy"); }, [params]);

  return (
    <Form
      ref={ref}
      action="/admin"
      scroll={false}
      className={className}
      onSubmit={(event) => {
        const form = ref.current;
        if (!form || sameQuery(new FormData(event.currentTarget), params)) return;
        form.setAttribute("aria-busy", "true");
        // Same-URL submits produce no params change; never leave the list dimmed.
        window.setTimeout(() => form.removeAttribute("aria-busy"), 8_000);
      }}
    >
      {children}
    </Form>
  );
}
