"use client";

import { useState } from "react";
import styles from "../../../admin.module.css";

/** Article category (shared by every language of the article); saves immediately. */
export function CategoryPicker({ localizationId, options, initialCategoryId, importedCategoryName, canWrite, lockedReason }: {
  localizationId: string;
  options: Array<{ id: string; label: string }>;
  initialCategoryId: string | null;
  importedCategoryName: string | null;
  canWrite: boolean;
  lockedReason: string | null;
}) {
  const [value, setValue] = useState(initialCategoryId ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function change(next: string) {
    const previous = value;
    setValue(next); setState("saving"); setError("");
    try {
      const response = await fetch(`/api/admin/posts/${localizationId}/category`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: next || null }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setValue(previous); setState("error"); setError(body.error ?? "The category could not be saved.");
        return;
      }
      setState("saved");
    } catch {
      setValue(previous); setState("error"); setError("Could not reach the server. Check your connection and try again.");
    }
  }

  return <section>
    <h2>Category</h2>
    <label>
      <span className={styles.srOnly}>Article category</span>
      <select value={value} disabled={!canWrite || Boolean(lockedReason) || state === "saving"} onChange={(event) => void change(event.target.value)}>
        <option value="">No category</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
    <p className={styles.muted} role="status">
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved. Applies to every language of this article." : "Applies to every language of this article."}
    </p>
    {lockedReason && <p className={styles.muted}>{lockedReason}</p>}
    {importedCategoryName && <p className={styles.muted}>The public page currently shows the imported category “{importedCategoryName}”.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
