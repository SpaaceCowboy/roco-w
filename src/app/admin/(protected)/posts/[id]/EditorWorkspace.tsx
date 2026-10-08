"use client";

import type { JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryPicker } from "./CategoryPicker";
import { EditorToolbar, HistoryControls } from "./EditorToolbar";
import { uploadMediaFile } from "./media-upload";
import { editorExtensions } from "@/lib/content/editor/extensions";
import { importHtmlToDocument, sanitizeImportableHtml } from "@/lib/content/editor/html-import";
import { formatHtmlSource } from "@/lib/content/editor/html-source";
import { rtlContentLocales, type ContentLocale } from "@/lib/admin/content-locales";
import { publishedArticlePath } from "@/config/blog-routing";
import styles from "../../../admin.module.css";

type InitialArticle = {
  id: string; postId: string; locale: ContentLocale; status: string; version: number;
  title: string; slug: string; excerpt: string; authorName: string; document: JSONContent;
  seo: SeoSettings;
  translations: Array<{ id: string; locale: ContentLocale; status: string; title: string }>;
};
type SeoSettings = {
  title: string | null; description: string | null; canonicalOverride: string | null;
  noIndex: boolean; noFollow: boolean; socialTitle: string | null; socialDescription: string | null;
  featuredMediaId: string | null; featuredImageAlt: string; socialMediaId: string | null;
};
type SeoCheck = { code: string; severity: "error" | "warning"; message: string };
type Revision = {
  revisionNumber: number; title: string; slug: string; excerpt: string; editorDocument: JSONContent;
  renderedHtml: string; metadata: unknown; createdAt: string; createdBy: string | null;
};
type Snapshot = { title: string; slug: string; excerpt: string; authorName: string; document: JSONContent; seo: SeoSettings };
type EditorMode = "visual" | "source";

function fingerprint(snapshot: Snapshot): string { return JSON.stringify(snapshot); }

export function EditorWorkspace({ initial, revisions, availableLocales, mediaConfigured, workflowPermissions, initialSeoChecks, category }: {
  initial: InitialArticle; revisions: Revision[]; availableLocales: ContentLocale[]; mediaConfigured: boolean;
  workflowPermissions: { write: boolean; review: boolean; publish: boolean; archive: boolean };
  initialSeoChecks: SeoCheck[];
  category: { options: Array<{ id: string; label: string }>; initialCategoryId: string | null; importedCategoryName: string | null; lockedReason: string | null };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [authorName, setAuthorName] = useState(initial.authorName);
  const [document, setDocument] = useState(initial.document);
  const [seo, setSeo] = useState(initial.seo);
  const [seoChecks, setSeoChecks] = useState<SeoCheck[]>(initialSeoChecks);
  const [version, setVersion] = useState(initial.version);
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving" | "conflict" | "error">("saved");
  const [message, setMessage] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [sourceDraft, setSourceDraft] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [sourceDirty, setSourceDirty] = useState(false);
  const versionRef = useRef(initial.version);
  const savedFingerprintRef = useRef(fingerprint({ title, slug, excerpt, authorName, document, seo }));
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const conflictRef = useRef(false);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initial.document,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: styles.editorSurface, dir: rtlContentLocales.has(initial.locale) ? "rtl" : "ltr", "aria-label": "Article body" },
      transformPastedHTML: (html) => {
        try {
          const sanitized = sanitizeImportableHtml(html);
          if (sanitized.warnings.length) queueMicrotask(() => setImportNotice(sanitized.warnings.join(" ")));
          return sanitized.html;
        } catch {
          return html;
        }
      },
    },
    onUpdate: ({ editor: current }) => setDocument(current.getJSON()),
  });

  function applyImportWarnings(warnings: string[]) {
    setImportNotice(warnings.length ? warnings.join(" ") : "HTML imported into the body.");
    setSaveState("unsaved");
  }

  function openSourceMode() {
    if (!editor) return;
    setSourceDraft(formatHtmlSource(editor.getHTML()));
    setSourceError("");
    setSourceDirty(false);
    setEditorMode("source");
  }

  function applySourceDraft(options: { switchToVisual?: boolean } = {}): JSONContent | null {
    if (!editor) return null;
    try {
      const result = importHtmlToDocument(sourceDraft, generateJSON);
      editor.commands.setContent(result.document, { emitUpdate: true });
      setDocument(result.document);
      setSourceError("");
      setSourceDirty(false);
      applyImportWarnings(result.warnings);
      if (options.switchToVisual) setEditorMode("visual");
      return result.document;
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Could not apply HTML source");
      return null;
    }
  }

  function showVisualMode() {
    if (!sourceDirty) {
      setEditorMode("visual");
      return;
    }
    applySourceDraft({ switchToVisual: true });
  }

  function discardSourceChanges() {
    if (!editor) return;
    setSourceDraft(formatHtmlSource(editor.getHTML()));
    setSourceError("");
    setSourceDirty(false);
    setEditorMode("visual");
  }

  async function performSave(snapshot: Snapshot): Promise<boolean> {
    const nextFingerprint = fingerprint(snapshot);
    if (nextFingerprint === savedFingerprintRef.current) return true;
    if (conflictRef.current) return false;
    setSaveState("saving"); setMessage("");
    try {
      const response = await fetch(`/api/admin/posts/${initial.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...snapshot, version: versionRef.current }),
      });
      const body = await response.json();
      if (response.status === 409 && body.code === "version_conflict") {
        conflictRef.current = true; setSaveState("conflict");
        setMessage("A newer version exists. Reload before making more changes; your current text remains in this tab.");
        return false;
      }
      if (!response.ok) throw new Error(body.error ?? "Autosave failed");
      versionRef.current = body.item.version; setVersion(body.item.version); savedFingerprintRef.current = nextFingerprint;
      setSeoChecks(body.seoChecks ?? []);
      setSaveState("saved");
      return true;
    } catch (error) {
      setSaveState("error"); setMessage(error instanceof Error ? error.message : "Autosave failed");
      return false;
    }
  }

  function queueSave(snapshot: Snapshot): Promise<boolean> {
    const queued = saveChainRef.current.then(() => performSave(snapshot));
    saveChainRef.current = queued;
    return queued;
  }

  const currentFingerprint = fingerprint({ title, slug, excerpt, authorName, document, seo });
  useEffect(() => {
    if (currentFingerprint === savedFingerprintRef.current || conflictRef.current) return;
    setSaveState("unsaved");
    const snapshot = { title, slug, excerpt, authorName, document, seo };
    const timer = window.setTimeout(() => { void queueSave(snapshot); }, 1_200);
    return () => window.clearTimeout(timer);
  // queueSave is serialized through a promise chain.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFingerprint]);

  useEffect(() => {
    if (saveState === "saved" && !sourceDirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState, sourceDirty]);

  async function preview() {
    const popup = window.open("about:blank", "_blank");
    const previewDocument = editorMode === "source" && sourceDirty ? applySourceDraft() : document;
    if (!previewDocument) { popup?.close(); return; }
    const saved = await queueSave({ title, slug, excerpt, authorName, document: previewDocument, seo });
    if (!saved) { popup?.close(); return; }
    const response = await fetch(`/api/admin/posts/${initial.id}/preview-token`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) { popup?.close(); setMessage(body.error ?? "Could not create preview"); setSaveState("error"); return; }
    if (popup) popup.location.href = body.url; else window.open(body.url, "_blank", "noopener,noreferrer");
  }

  async function createTranslation(locale: ContentLocale) {
    const response = await fetch(`/api/admin/posts/${initial.id}/translations`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Could not create translation"); return; }
    router.push(`/admin/posts/${body.item.id}`);
  }

  async function rollback(revisionNumber: number) {
    if (!window.confirm(`Restore revision ${revisionNumber} as a new draft revision?`)) return;
    const response = await fetch(`/api/admin/posts/${initial.id}/rollback`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ revisionNumber, version: versionRef.current }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Could not restore revision"); return; }
    window.location.reload();
  }

  const displayedSaveState = sourceDirty ? "unsaved" : saveState;

  return <main id="admin-main" tabIndex={-1} className={styles.editorPage}>
    <div className={styles.editorTopbar}>
      <Link href="/admin" className={styles.backLink}>← Articles</Link>
      <div className={styles.saveState} data-state={displayedSaveState} role="status"><span />{sourceDirty ? "Source changes not applied" : saveState === "saved" ? `Saved · v${version}` : saveState}</div>
      {initial.status === "published" && <Link className={styles.secondaryButton} href={publishedArticlePath(initial.locale, initial.slug)} target="_blank" rel="noopener noreferrer">View published article</Link>}
      <button type="button" className={styles.secondaryButton} onClick={preview}>Preview</button>
    </div>
    {message && <div className={saveState === "conflict" || saveState === "error" ? styles.conflictBanner : styles.notice} role="alert">{message}{saveState === "conflict" && <button type="button" onClick={() => window.location.reload()}>Reload latest</button>}</div>}
    <div className={styles.editorGrid}>
      <section className={styles.editorMain} dir={rtlContentLocales.has(initial.locale) ? "rtl" : "ltr"}>
        <label className={styles.titleField}><span>Title</span><textarea value={title} maxLength={220} rows={2} onChange={(event) => setTitle(event.target.value)} /></label>
        <label><span>Excerpt</span><textarea value={excerpt} maxLength={600} rows={3} onChange={(event) => setExcerpt(event.target.value)} /></label>
        <div className={styles.editorModeRow} dir="ltr">
          {editorMode === "visual" && editor ? <HistoryControls editor={editor} /> : <span />}
          <div className={styles.editorModeBar} role="tablist" aria-label="Article body editing mode" onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
            const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
            next?.focus();
            next?.click();
          }}>
            <button type="button" role="tab" aria-selected={editorMode === "visual"} tabIndex={editorMode === "visual" ? 0 : -1} onClick={showVisualMode}>Visual</button>
            <button type="button" role="tab" aria-selected={editorMode === "source"} tabIndex={editorMode === "source" ? 0 : -1} onClick={openSourceMode} disabled={!editor}>HTML source</button>
          </div>
        </div>
        {editorMode === "visual" ? <>
          <EditorToolbar editor={editor} locale={initial.locale} mediaConfigured={mediaConfigured} onImported={applyImportWarnings} />
          <EditorContent editor={editor} />
        </> : <div className={styles.sourceEditorPanel}>
          <label htmlFor="article-html-source">Article HTML</label>
          <textarea
            id="article-html-source"
            className={styles.sourceEditor}
            value={sourceDraft}
            maxLength={400_000}
            rows={28}
            dir="ltr"
            wrap="soft"
            spellCheck={false}
            aria-describedby="article-html-source-help"
            aria-invalid={Boolean(sourceError)}
            onChange={(event) => {
              setSourceDraft(event.target.value);
              setSourceError("");
              setSourceDirty(true);
            }}
          />
          <p id="article-html-source-help" className={styles.muted}>Only article-safe HTML is kept. Scripts, style blocks, event handlers, arbitrary CSS, and images without an uploaded media ID are removed. Text alignment is supported.</p>
          {sourceError && <p className={styles.error} role="alert">{sourceError}</p>}
          <div className={styles.sourceEditorActions}>
            <button type="button" onClick={() => applySourceDraft({ switchToVisual: true })} disabled={!sourceDirty}>Apply and return to visual</button>
            <button type="button" onClick={discardSourceChanges} disabled={!sourceDirty}>Discard source changes</button>
          </div>
        </div>}
        {importNotice && <p className={styles.notice} role="status">{importNotice}</p>}
      </section>
      <aside className={styles.editorSidebar}>
        <WorkflowControls localizationId={initial.id} status={initial.status} permissions={workflowPermissions} />
        <section><h2>Article</h2><dl><div><dt>Locale</dt><dd>{initial.locale}</dd></div><div><dt>Status</dt><dd>{initial.status}</dd></div></dl>
          <label>Slug<input value={slug} maxLength={180} dir="ltr" onChange={(event) => setSlug(event.target.value)} /></label>
          <label>Author<input value={authorName} maxLength={160} onChange={(event) => setAuthorName(event.target.value)} /></label>
        </section>
        <CategoryPicker localizationId={initial.id} options={category.options} initialCategoryId={category.initialCategoryId} importedCategoryName={category.importedCategoryName} canWrite={workflowPermissions.write} lockedReason={category.lockedReason} />
        <SeoPanel
          locale={initial.locale}
          slug={slug}
          articleTitle={title}
          excerpt={excerpt}
          seo={seo}
          setSeo={setSeo}
          checks={seoChecks}
          canEditCanonical={workflowPermissions.review}
          mediaConfigured={mediaConfigured}
        />
        <section><h2>Translations</h2><div className={styles.translationList}>{initial.translations.map((translation) => <Link key={translation.id} href={`/admin/posts/${translation.id}`}><span>{translation.locale}</span>{translation.title}</Link>)}</div>
          {!!availableLocales.length && <div className={styles.addTranslations}>{availableLocales.map((locale) => <button type="button" key={locale} onClick={() => createTranslation(locale)}>+ {locale}</button>)}</div>}
        </section>
      </aside>
    </div>
    <RevisionHistory revisions={revisions} onRollback={rollback} />
  </main>;
}

function WorkflowControls({ localizationId, status, permissions }: {
  localizationId: string; status: string;
  permissions: { write: boolean; review: boolean; publish: boolean; archive: boolean };
}) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retryOperationId, setRetryOperationId] = useState<string | null>(null);

  async function transition(action: string) {
    if (["publish", "unpublish", "archive"].includes(action) && !window.confirm(`${action.replaceAll("_", " ")} this article?`)) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/posts/${localizationId}/publication`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        idempotencyKey: crypto.randomUUID(),
        ...(action === "schedule" && scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Transition failed"); setBusy(false); return; }
    if (body.warnings?.length) {
      setRetryOperationId(body.operationId);
      setMessage(`The article state changed, but ${body.warnings.length} cache refresh target${body.warnings.length === 1 ? "" : "s"} failed.`);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  async function retryRefresh() {
    if (!retryOperationId) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/publication-operations/${retryOperationId}/retry-refresh`, { method: "POST" });
    const body = await response.json();
    if (!response.ok || body.warnings?.length) {
      setMessage(body.error ?? `Refresh still failed for ${body.warnings.length} target(s).`);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return <section className={styles.workflow}><h2>Workflow</h2>
    <p>Current state: <strong>{status}</strong></p>
    <div className={styles.workflowActions}>
      {status === "draft" && permissions.write && <button type="button" disabled={busy} onClick={() => transition("request_review")}>Request review</button>}
      {status === "review" && permissions.review && <button type="button" disabled={busy} onClick={() => transition("return_to_draft")}>Return to draft</button>}
      {status === "review" && permissions.publish && <button type="button" disabled={busy} onClick={() => transition("publish")}>Approve & publish</button>}
      {status === "review" && permissions.publish && <><label>Publish time<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label><button type="button" disabled={busy || !scheduledAt} onClick={() => transition("schedule")}>Approve & schedule</button></>}
      {status === "scheduled" && permissions.review && <button type="button" disabled={busy} onClick={() => transition("return_to_draft")}>Cancel schedule</button>}
      {status === "scheduled" && permissions.publish && <button type="button" disabled={busy} onClick={() => transition("publish")}>Publish now</button>}
      {status === "published" && permissions.publish && <button type="button" disabled={busy} onClick={() => transition("unpublish")}>Unpublish to draft</button>}
      {status === "published" && permissions.archive && <button type="button" disabled={busy} onClick={() => transition("archive")}>Archive</button>}
      {status === "archived" && permissions.archive && <button type="button" disabled={busy} onClick={() => transition("restore")}>Restore publication</button>}
      {retryOperationId && <button type="button" disabled={busy} onClick={retryRefresh}>Retry failed cache refreshes</button>}
    </div>
    {message && <p className={styles.error} role="alert">{message}</p>}
  </section>;
}

function SeoPanel({ locale, slug, articleTitle, excerpt, seo, setSeo, checks, canEditCanonical, mediaConfigured }: {
  locale: ContentLocale; slug: string; articleTitle: string; excerpt: string; seo: SeoSettings;
  setSeo: (value: SeoSettings | ((current: SeoSettings) => SeoSettings)) => void;
  checks: SeoCheck[]; canEditCanonical: boolean; mediaConfigured: boolean;
}) {
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [socialFile, setSocialFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState("");
  const update = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) => setSeo((current) => ({ ...current, [key]: value }));
  async function upload(kind: "featured" | "social") {
    const file = kind === "featured" ? featuredFile : socialFile;
    if (!file) return;
    try {
      const result = await uploadMediaFile(file, setUploadState);
      if (kind === "featured") update("featuredMediaId", result.item.id); else update("socialMediaId", result.item.id);
      setUploadState(`${kind === "featured" ? "Featured" : "Social"} image selected (${result.item.width}×${result.item.height}).`);
    } catch (error) { setUploadState(error instanceof Error ? error.message : "Upload failed"); }
  }
  const previewTitle = seo.title || articleTitle || "Article title";
  const previewDescription = seo.description || excerpt || "Article description";
  const socialTitle = seo.socialTitle || previewTitle;
  const socialDescription = seo.socialDescription || previewDescription;
  const seoTitleLength = (seo.title || articleTitle).length;
  const seoDescriptionLength = (seo.description || excerpt).length;

  return <section className={styles.seoPanel}><h2>SEO</h2>
    <label>SEO title<input value={seo.title ?? ""} maxLength={120} placeholder={articleTitle} onChange={(event) => update("title", event.target.value || null)} /><small data-over={seoTitleLength > 60}>{seoTitleLength}/60 recommended</small></label>
    <label>Meta description<textarea value={seo.description ?? ""} maxLength={320} rows={3} placeholder={excerpt} onChange={(event) => update("description", event.target.value || null)} /><small data-over={seoDescriptionLength > 160}>{seoDescriptionLength}/160 recommended</small></label>
    <label>Canonical override<input type="url" dir="ltr" value={seo.canonicalOverride ?? ""} disabled={!canEditCanonical} placeholder="Generated automatically" onChange={(event) => update("canonicalOverride", event.target.value || null)} />{!canEditCanonical && <small>Reviewer permission required</small>}</label>
    <fieldset><legend>Robots</legend><label><input type="checkbox" checked={seo.noIndex} onChange={(event) => update("noIndex", event.target.checked)} /> noindex</label><label><input type="checkbox" checked={seo.noFollow} onChange={(event) => update("noFollow", event.target.checked)} /> nofollow</label></fieldset>
    <label>Featured image alt<input value={seo.featuredImageAlt} maxLength={300} onChange={(event) => update("featuredImageAlt", event.target.value)} /></label>
    {mediaConfigured && <div className={styles.seoUpload}><label>Featured image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setFeaturedFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!featuredFile} onClick={() => upload("featured")}>{seo.featuredMediaId ? "Replace featured" : "Upload featured"}</button></div>}
    <label>Social title<input value={seo.socialTitle ?? ""} maxLength={120} placeholder={previewTitle} onChange={(event) => update("socialTitle", event.target.value || null)} /></label>
    <label>Social description<textarea value={seo.socialDescription ?? ""} maxLength={320} rows={3} placeholder={previewDescription} onChange={(event) => update("socialDescription", event.target.value || null)} /></label>
    {mediaConfigured && <div className={styles.seoUpload}><label>1200×630 social image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setSocialFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!socialFile} onClick={() => upload("social")}>{seo.socialMediaId ? "Replace social" : "Upload social"}</button></div>}
    {uploadState && <p className={styles.uploadState} role="status">{uploadState}</p>}
    <div className={styles.searchPreview} dir={rtlContentLocales.has(locale) ? "rtl" : "ltr"}><span>rocobroker.com{publishedArticlePath(locale, slug).replaceAll("/", " › ")}</span><strong>{previewTitle}</strong><p>{previewDescription}</p></div>
    <div className={styles.socialPreview} dir={rtlContentLocales.has(locale) ? "rtl" : "ltr"}><div>{seo.socialMediaId ? "Custom 1200×630 image" : seo.featuredMediaId ? "Featured image fallback" : "Default social image"}</div><span>ROCOBROKER.COM</span><strong>{socialTitle}</strong><p>{socialDescription}</p></div>
    {!!checks.length && <div className={styles.seoChecks}><h3>Editorial checks</h3><ul>{checks.map((check) => <li key={`${check.code}-${check.message}`} data-severity={check.severity}>{check.message}</li>)}</ul></div>}
  </section>;
}

function plainText(document: JSONContent): string {
  const parts: string[] = [];
  const visit = (node: JSONContent) => { if (node.text) parts.push(node.text); for (const child of node.content ?? []) visit(child); };
  visit(document); return parts.join(" ").replace(/\s+/g, " ").trim();
}

function RevisionHistory({ revisions, onRollback }: { revisions: Revision[]; onRollback: (revision: number) => Promise<void> }) {
  const [left, setLeft] = useState(revisions[1]?.revisionNumber ?? revisions[0]?.revisionNumber ?? 1);
  const [right, setRight] = useState(revisions[0]?.revisionNumber ?? 1);
  const byNumber = useMemo(() => new Map(revisions.map((revision) => [revision.revisionNumber, revision])), [revisions]);
  const selected = [byNumber.get(left), byNumber.get(right)];
  return <section className={styles.revisions}><div className={styles.revisionHeading}><div><p className={styles.eyebrow}>Immutable history</p><h2>Revisions</h2></div><div><label>Compare<select value={left} onChange={(event) => setLeft(Number(event.target.value))}>{revisions.map((revision) => <option key={revision.revisionNumber} value={revision.revisionNumber}>#{revision.revisionNumber}</option>)}</select></label><span>to</span><label><span className={styles.srOnly}>Compare to</span><select value={right} onChange={(event) => setRight(Number(event.target.value))}>{revisions.map((revision) => <option key={revision.revisionNumber} value={revision.revisionNumber}>#{revision.revisionNumber}</option>)}</select></label></div></div>
    <div className={styles.comparison}>{selected.map((revision, index) => revision && <article key={`${revision.revisionNumber}-${index}`}><header><strong>Revision {revision.revisionNumber}</strong><time dateTime={revision.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.createdAt))}</time></header><h3>{revision.title}</h3><code>/{revision.slug}</code><p>{revision.excerpt}</p><div>{plainText(revision.editorDocument) || "Empty body"}</div></article>)}</div>
    <ol className={styles.revisionList}>{revisions.map((revision) => <li key={revision.revisionNumber}><div><strong>#{revision.revisionNumber} · {revision.title}</strong><span>{revision.createdBy ?? "System"} · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.createdAt))}</span></div><button type="button" onClick={() => onRollback(revision.revisionNumber)}>Restore as draft</button></li>)}</ol>
  </section>;
}
