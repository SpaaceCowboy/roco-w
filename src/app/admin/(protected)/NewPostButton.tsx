"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { contentLocales } from "@/lib/admin/content-locales";
import styles from "../admin.module.css";

export function NewPostButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);

  function close() {
    restoreFocusRef.current = true;
    setOpen(false);
  }

  useEffect(() => {
    if (open || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  async function create(formData: FormData) {
    setBusy(true); setError("");
    const response = await fetch("/api/admin/posts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: formData.get("locale"), title: formData.get("title"), authorName: formData.get("authorName") }),
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Could not create article"); setBusy(false); return; }
    router.push(`/admin/posts/${body.item.id}`);
  }

  return <>
    <button ref={triggerRef} type="button" className={styles.primaryButton} onClick={() => setOpen(true)}>New article</button>
    {open && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.currentTarget === event.target && close()}>
      <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="new-post-title">
        <h2 id="new-post-title">Create article</h2>
        <form action={create}>
          <label>Working title<input name="title" required maxLength={220} autoFocus /></label>
          <label>Locale<select name="locale" defaultValue="en">{contentLocales.map((locale) => <option key={locale}>{locale}</option>)}</select></label>
          <label>Public author name<input name="authorName" required maxLength={160} defaultValue="RocoBroker Editorial" /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={close}>Cancel</button><button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create"}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
