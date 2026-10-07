"use client";

import type { ChangeEvent, ReactNode } from "react";

function submit(event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
  event.currentTarget.form?.requestSubmit();
}

/** Filter controls that apply immediately, so selecting a value re-runs the query. */
export function AutoSubmitSelect({ name, defaultValue, children }: {
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={submit}
    >
      {children}
    </select>
  );
}

export function AutoSubmitInput({ type, name, defaultValue, label }: {
  type: "date";
  name: string;
  defaultValue?: string;
  label: string;
}) {
  return (
    <input
      type={type}
      name={name}
      defaultValue={defaultValue}
      aria-label={label}
      onChange={submit}
    />
  );
}
