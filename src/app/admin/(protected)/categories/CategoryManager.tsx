"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { contentLocales, rtlContentLocales, type ContentLocale } from "@/lib/admin/content-locales";
import { localeLabels } from "../dashboard-helpers";
import styles from "../../admin.module.css";

type Category = {
  id: string;
  updatedAt: string;
  usage: number;
  localizations: Array<{ locale: ContentLocale; name: string; slug: string }>;
};

type Draft = Record<ContentLocale, { name: string; slug: string }>;

/** Some legacy slugs were stored percent-encoded; show and save them readable. */
function readableSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function emptyDraft(category?: Category): Draft {
  return Object.fromEntries(contentLocales.map((locale) => {
    const existing = category?.localizations.find((item) => item.locale === locale);
    return [locale, { name: existing?.name ?? "", slug: existing ? readableSlug(existing.slug) : "" }];
  })) as Draft;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; issues?: Array<{ message: string }> };
  return body.issues?.[0]?.message ?? body.error ?? fallback;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (editing && !dialog.open) dialog.showModal();
    if (!editing && dialog.open) dialog.close();
  }, [editing]);

  function open(category: Category | "new") {
    setDraft(emptyDraft(category === "new" ? undefined : category));
    setError("");
    setEditing(category);
  }

  async function save() {
    const localizations = contentLocales
      .filter((locale) => draft[locale].name.trim() || draft[locale].slug.trim())
      .map((locale) => ({ locale, name: draft[locale].name.trim(), slug: draft[locale].slug.trim() || draft[locale].name.trim() }));
    const unnamed = localizations.find((item) => !item.name);
    if (!localizations.length) { setError("Add a name in at least one language."); return; }
    if (unnamed) { setError(`${localeLabels[unnamed.locale]} has a slug but no name.`); return; }
    setBusy(true); setError("");
    try {
      const isNew = editing === "new";
      const response = await fetch(isNew ? "/api/admin/categories" : `/api/admin/categories/${(editing as Category).id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localizations }),
      });
      if (!response.ok) { setError(await readError(response, "The category could not be saved.")); return; }
      setEditing(null);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    const name = category.localizations[0]?.name ?? "this category";
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      if (!response.ok) { setRowError({ id: category.id, message: await readError(response, "The category could not be deleted.") }); return; }
      router.refresh();
    } catch {
      setRowError({ id: category.id, message: "Could not reach the server. Check your connection and try again." });
    }
  }

  return <>
    <header className={styles.pageHead}>
      <h1>Categories</h1>
      <div className={styles.headActions}><button type="button" className={styles.primaryButton} onClick={() => open("new")}>New category</button></div>
    </header>

    <section className={styles.listCard} aria-label="Categories">
      <p className={styles.listMeta}>{categories.length} categor{categories.length === 1 ? "y" : "ies"} · names and slugs per language</p>
      <div className={styles.tableWrap}>
        <table className={styles.articleTable}>
          <thead><tr>
            <th>Name</th>
            <th>Languages</th>
            <th>Articles</th>
            <th><span className={styles.srOnly}>Actions</span></th>
          </tr></thead>
          <tbody>{categories.map((category) => {
            const primary = category.localizations.find((item) => item.locale === "en") ?? category.localizations[0];
            return <tr key={category.id}>
              <td data-label="Name">
                <span className={styles.tableTitleLink} dir="auto">{primary?.name ?? "Untitled"}</span>
                <span className={styles.rowMeta}><span className={styles.publicPath} dir="ltr">{primary ? `${primary.locale}/${readableSlug(primary.slug)}` : ""}</span></span>
              </td>
              <td data-label="Languages">
                <span className={styles.coverageList}>
                  {contentLocales.map((locale) => {
                    const item = category.localizations.find((entry) => entry.locale === locale);
                    return <span key={locale} className={styles.coverageDot} data-present={Boolean(item)} title={`${localeLabels[locale]}: ${item ? `${item.name} (${readableSlug(item.slug)})` : "missing"}`}>
                      {locale === "zh-hans" ? "zh" : locale}
                    </span>;
                  })}
                </span>
              </td>
              <td data-label="Articles">{category.usage}</td>
              <td data-label="Actions">
                <div className={styles.rowActions}>
                  <button type="button" className={styles.tableLink} onClick={() => open(category)}>Edit</button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={category.usage > 0}
                    title={category.usage > 0 ? "Used by articles; it can be deleted once no articles use it" : undefined}
                    onClick={() => remove(category)}
                  >Delete</button>
                </div>
                {rowError?.id === category.id && <p className={styles.rowActionError} role="alert">{rowError.message}</p>}
              </td>
            </tr>;
          })}</tbody>
        </table>
        {!categories.length && <div className={styles.emptyState}>
          <strong>No categories yet</strong>
          <p>Create one to group articles on the blog.</p>
        </div>}
      </div>
    </section>

    <dialog
      ref={dialogRef}
      className={`${styles.modal} ${styles.categoryDialog}`}
      aria-labelledby="category-dialog-title"
      onCancel={() => setEditing(null)}
      onClose={() => setEditing(null)}
    >
      {editing && <div className={styles.modalBody}>
        <h2 id="category-dialog-title">{editing === "new" ? "New category" : "Edit category"}</h2>
        <p className={styles.muted}>Fill in the languages you publish in. Leave a slug empty to build it from the name.</p>
        <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className={styles.categoryGrid}>
            <span aria-hidden="true" />
            <span className={styles.categoryGridHead} aria-hidden="true">Name</span>
            <span className={styles.categoryGridHead} aria-hidden="true">Slug</span>
            {contentLocales.map((locale) => <div key={locale} className={styles.categoryRow}>
              <span className={styles.localeTag} title={localeLabels[locale]}>{locale === "zh-hans" ? "zh" : locale}</span>
              <input
                aria-label={`${localeLabels[locale]} name`}
                dir={rtlContentLocales.has(locale) ? "rtl" : "auto"}
                value={draft[locale].name}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, [locale]: { ...draft[locale], name: event.target.value } })}
              />
              <input
                aria-label={`${localeLabels[locale]} slug`}
                dir={rtlContentLocales.has(locale) ? "rtl" : "ltr"}
                value={draft[locale].slug}
                maxLength={180}
                placeholder="from name"
                onChange={(event) => setDraft({ ...draft, [locale]: { ...draft[locale], slug: event.target.value } })}
              />
            </div>)}
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? "Saving…" : "Save category"}</button>
          </div>
        </form>
      </div>}
    </dialog>
  </>;
}
