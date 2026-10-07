"use client";

import { useEffect, useRef } from "react";

/** Search input that submits its form after a short pause in typing. */
export function LiveSearch({ defaultValue }: { defaultValue?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const submitted = useRef(defaultValue ?? "");

  // Removing the search chip changes the URL without remounting the input.
  useEffect(() => {
    submitted.current = defaultValue ?? "";
    if (ref.current && document.activeElement !== ref.current) ref.current.value = defaultValue ?? "";
  }, [defaultValue]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <input
      ref={ref}
      name="q"
      type="search"
      defaultValue={defaultValue}
      placeholder="Search title or slug"
      autoComplete="off"
      onChange={(event) => {
        const input = event.currentTarget;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          if (input.value.trim() === submitted.current) return;
          submitted.current = input.value.trim();
          input.form?.requestSubmit();
        }, 400);
      }}
    />
  );
}
