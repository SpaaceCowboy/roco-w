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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  async function create(formData: FormData) {
    setBusy(true); setError("");
    const html = String(formData.get("html") ?? "").trim();
    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale: formData.get("locale"),
          title: formData.get("title"),
          authorName: formData.get("authorName"),
          ...(html ? { html } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error ?? "Could not create article"); setBusy(false); return; }
      router.push(`/admin/posts/${body.item.id}`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return <>
    <button type="button" className={styles.primaryButton} onClick={() => setOpen(true)}>New article</button>
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="new-post-title"
      onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
      onCancel={() => setOpen(false)}
      onClose={() => setOpen(false)}
    >
      {open && <div className={styles.modalBody}>
        <h2 id="new-post-title">Create article</h2>
        <form action={create}>
          <label>Working title<input name="title" required maxLength={220} autoFocus /></label>
          <label>Locale<select name="locale" defaultValue="en">{contentLocales.map((locale) => <option key={locale}>{locale}</option>)}</select></label>
          <label>Public author name<input name="authorName" required maxLength={160} defaultValue="RocoBroker Editorial" /></label>
          <label>HTML body (optional)<textarea name="html" rows={6} maxLength={400_000} placeholder="Paste article HTML to seed the draft. Scripts, external images, and unsafe tags are stripped." /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Cancel</button><button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create"}</button></div>
        </form>
      </div>}
    </dialog>
  </>;
}
