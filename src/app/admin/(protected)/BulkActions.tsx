"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { allowedPublicationSourceStatuses, type PublicationAction } from "@/lib/admin/publication-policy";
import { BULK_FORM_ID } from "./dashboard-helpers";
import styles from "../admin.module.css";


type Bulk = "archive" | "draft";

const bulkTransitions: Record<Bulk, PublicationAction[]> = {
  archive: ["archive"],
  draft: ["unpublish", "return_to_draft"],
};

/** The transition a row needs for a bulk command (per the publication policy), or null when none applies. */
function transitionFor(bulk: Bulk, status: string): PublicationAction | null {
  return bulkTransitions[bulk].find((action) => allowedPublicationSourceStatuses(action).includes(status)) ?? null;
}

function selectedBoxes(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids"]:checked`));
}

/**
 * Bulk archive / move-to-draft over the row checkboxes. Each row goes through the
 * normal publication endpoint (its own permission check, idempotency key and cache
 * refresh), one at a time, and the outcome is reported per row.
 */
export function BulkActions({ canArchive, canDraft }: { canArchive: boolean; canDraft: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");

  const params = useSearchParams();

  useEffect(() => {
    const recount = () => setCount(selectedBoxes().length);
    document.addEventListener("change", recount);
    return () => document.removeEventListener("change", recount);
  }, []);

  // Filters, tabs and paging swap the rows without remounting this bar: start a fresh selection.
  const [seenParams, setSeenParams] = useState(params);
  if (params !== seenParams) {
    setSeenParams(params);
    setCount(0);
    setReport("");
  }
  useEffect(() => {
    for (const box of selectedBoxes()) box.checked = false;
  }, [params]);

  async function run(bulk: Bulk) {
    const rows = selectedBoxes().map((box) => ({ box, id: box.value, title: box.dataset.title ?? "", action: transitionFor(bulk, box.dataset.status ?? "") }));
    const eligible = rows.filter((row) => row.action);
    const skipped = rows.length - eligible.length;
    const verb = bulk === "archive" ? "Archive" : "Move to draft";
    if (!eligible.length) {
      setReport(bulk === "archive" ? "Only published articles can be archived." : "Only published, in-review or scheduled articles can move to draft.");
      return;
    }
    const live = bulk === "draft" ? eligible.filter((row) => row.action === "unpublish").length : 0;
    const warning = live
      ? `\n\nWARNING: ${live} of these ${live === 1 ? "is" : "are"} live. ${live === 1 ? "It" : "They"} will be removed from the public website immediately and ${live === 1 ? "its URL stops" : "their URLs stop"} working until republished.`
      : "";
    const skippedNote = skipped ? ` ${skipped} selected item${skipped === 1 ? " doesn't" : "s don't"} qualify and will be skipped.` : "";
    if (!window.confirm(`${verb} ${eligible.length} article${eligible.length === 1 ? "" : "s"}?${skippedNote}${warning}`)) return;

    setBusy(true); setReport("");
    const failures: string[] = [];
    let done = 0;
    for (const row of eligible) {
      try {
        const response = await fetch(`/api/admin/posts/${row.id}/publication`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: row.action, idempotencyKey: crypto.randomUUID() }),
        });
        if (response.ok) { done += 1; row.box.checked = false; continue; }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        failures.push(`${row.title}: ${body.error ?? `failed (${response.status})`}`);
      } catch {
        failures.push(`${row.title}: could not reach the server`);
      }
    }
    setBusy(false);
    setCount(selectedBoxes().length);
    const past = bulk === "archive" ? "archived" : "moved to draft";
    setReport([
      `${done} of ${eligible.length} ${past}.`,
      skipped ? `${skipped} skipped (not eligible).` : "",
      failures.length ? `Failed — ${failures.join("; ")}` : "",
    ].filter(Boolean).join(" "));
    router.refresh();
  }

  function clear() {
    for (const box of selectedBoxes()) box.checked = false;
    setCount(0);
  }

  return <>
    <form id={BULK_FORM_ID} hidden onSubmit={(event) => event.preventDefault()} />
    {(count > 0 || report) && <div className={styles.bulkBar} role="region" aria-label="Bulk actions">
      {count > 0 && <>
        <strong>{count} selected</strong>
        {canArchive && <button type="button" className={styles.ghostButton} disabled={busy} onClick={() => run("archive")}>Archive</button>}
        {canDraft && <button type="button" className={styles.ghostButton} disabled={busy} onClick={() => run("draft")}>Move to draft</button>}
        <button type="button" className={styles.resetLink} disabled={busy} onClick={clear}>Clear selection</button>
      </>}
      {busy && <span role="status">Working…</span>}
      {report && !busy && <span className={styles.bulkReport} role="status">{report}</span>}
    </div>}
  </>;
}

/** Header checkbox: selects every eligible row on this page. */
export function SelectAll() {
  const ref = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  useEffect(() => { if (ref.current) ref.current.checked = false; }, [params]);
  return <input
    ref={ref}
    type="checkbox"
    aria-label="Select all articles on this page"
    onChange={(event) => {
      for (const box of document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids"]`)) box.checked = event.currentTarget.checked;
    }}
  />;
}
