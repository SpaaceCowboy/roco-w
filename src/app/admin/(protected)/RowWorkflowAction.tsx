"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicationAction } from "@/lib/admin/publication-policy";
import styles from "../admin.module.css";

type Props = {
  localizationId: string;
  action: PublicationAction;
  label: string;
};

const CONFIRM_ACTIONS: PublicationAction[] = ["publish", "archive"];

/**
 * One-click workflow transition from the article list. Reuses the existing
 * publication endpoint, which owns permission, idempotency, and revalidation.
 */
export function RowWorkflowAction({ localizationId, action, label }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (CONFIRM_ACTIONS.includes(action) && !window.confirm(`${label} this article?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/posts/${localizationId}/publication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, idempotencyKey: crypto.randomUUID() }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The action could not be completed.");
        return;
      }
      router.refresh();
    } catch {
      setError("The action could not be completed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.rowAction} onClick={run} disabled={busy}>
        {busy ? "Working…" : label}
      </button>
      {error && <span className={styles.rowActionError} role="alert">{error}</span>}
    </>
  );
}
