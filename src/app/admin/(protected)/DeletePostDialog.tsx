"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeletionDecision } from "@/lib/admin/deletion-policy";
import styles from "../admin.module.css";

const CONFIRMATION = "DELETE";

type Props = {
  localizationId: string;
  version: number;
  title: string;
  locale: string;
  localization: DeletionDecision;
  post: DeletionDecision;
};

/**
 * Dashboard row affordance for permanent deletion. The destructive action is
 * gated behind a typed confirmation; the server independently re-checks
 * permission, ownership, and content state, so this component is never the
 * security boundary.
 */
export function DeletePostDialog({ localizationId, version, title, locale, localization, post }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"localization" | "post">("localization");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supportRef, setSupportRef] = useState("");

  const scopeDecision = scope === "post" ? post : localization;
  const anyAllowed = localization.allowed || post.allowed;
  const canSubmit = scopeDecision.allowed && confirmation === CONFIRMATION && !busy;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function openDialog() {
    setScope(localization.allowed ? "localization" : "post");
    setConfirmation("");
    setError("");
    setSupportRef("");
    setOpen(true);
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/posts/${localizationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, expectedVersion: version }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; supportRef?: string };
      if (!response.ok) {
        setError(body.error ?? "The content could not be deleted.");
        setSupportRef(body.supportRef ?? "");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("The content could not be deleted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!anyAllowed) {
    return (
      <span className={styles.deleteUnavailable}>
        Delete unavailable: {localization.allowed === false ? localization.message : ""}
      </span>
    );
  }

  return (
    <>
      <button type="button" className={styles.deleteButton} onClick={openDialog}>
        Delete
      </button>
      <dialog
        ref={dialogRef}
        className={styles.deleteDialog}
        aria-labelledby={`delete-heading-${localizationId}`}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h2 id={`delete-heading-${localizationId}`}>Delete permanently?</h2>
          <p>
            This cannot be undone. <strong>{title}</strong> ({locale}) will be removed
            and its public URL will stop working.
          </p>

          {localization.allowed && post.allowed && (
            <fieldset className={styles.deleteScope}>
              <legend>What to delete</legend>
              <label>
                <input
                  type="radio"
                  name={`scope-${localizationId}`}
                  checked={scope === "localization"}
                  onChange={() => setScope("localization")}
                />
                This localization only
              </label>
              <label>
                <input
                  type="radio"
                  name={`scope-${localizationId}`}
                  checked={scope === "post"}
                  onChange={() => setScope("post")}
                />
                The entire post and every localization
              </label>
            </fieldset>
          )}

          {!scopeDecision.allowed && <p className={styles.deleteDenied}>{scopeDecision.message}</p>}

          <label className={styles.deleteConfirm}>
            Type {CONFIRMATION} to confirm
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`delete-warning-${localizationId}`}
            />
          </label>
          <p id={`delete-warning-${localizationId}`} className={styles.muted}>
            The action stays unavailable until the word matches exactly.
          </p>

          {error && (
            <p className={styles.deleteError} role="alert">
              {error}
              {supportRef ? ` Support reference: ${supportRef}` : ""}
            </p>
          )}

          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className={styles.dangerButton} disabled={!canSubmit}>
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
