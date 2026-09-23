"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { editorExtensions } from "@/lib/content/editor/extensions";
import { importHtmlToDocument, sanitizeImportableHtml } from "@/lib/content/editor/html-import";
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

function fingerprint(snapshot: Snapshot): string { return JSON.stringify(snapshot); }

export function EditorWorkspace({ initial, revisions, availableLocales, mediaConfigured, workflowPermissions, initialSeoChecks }: {
  initial: InitialArticle; revisions: Revision[]; availableLocales: ContentLocale[]; mediaConfigured: boolean;
  workflowPermissions: { write: boolean; review: boolean; publish: boolean; archive: boolean };
  initialSeoChecks: SeoCheck[];
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
    if (saveState === "saved") return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  async function preview() {
    const popup = window.open("about:blank", "_blank");
    const saved = await queueSave({ title, slug, excerpt, authorName, document, seo });
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

  return <main id="admin-main" tabIndex={-1} className={styles.editorPage}>
    <div className={styles.editorTopbar}>
      <Link href="/admin" className={styles.backLink}>← Articles</Link>
      <div className={styles.saveState} data-state={saveState} role="status"><span />{saveState === "saved" ? `Saved · v${version}` : saveState}</div>
      <button type="button" className={styles.secondaryButton} onClick={preview}>Preview</button>
    </div>
    {message && <div className={saveState === "conflict" || saveState === "error" ? styles.conflictBanner : styles.notice} role="alert">{message}{saveState === "conflict" && <button type="button" onClick={() => window.location.reload()}>Reload latest</button>}</div>}
    <div className={styles.editorGrid}>
      <section className={styles.editorMain} dir={rtlContentLocales.has(initial.locale) ? "rtl" : "ltr"}>
        <label className={styles.titleField}><span>Title</span><textarea value={title} maxLength={220} rows={2} onChange={(event) => setTitle(event.target.value)} /></label>
        <label><span>Excerpt</span><textarea value={excerpt} maxLength={600} rows={3} onChange={(event) => setExcerpt(event.target.value)} /></label>
        <EditorToolbar editor={editor} onImported={applyImportWarnings} />
        <EditorContent editor={editor} />
        {importNotice && <p className={styles.notice} role="status">{importNotice}</p>}
      </section>
      <aside className={styles.editorSidebar}>
        <WorkflowControls localizationId={initial.id} status={initial.status} permissions={workflowPermissions} />
        <section><h2>Article</h2><dl><div><dt>Locale</dt><dd>{initial.locale}</dd></div><div><dt>Status</dt><dd>{initial.status}</dd></div></dl>
          <label>Slug<input value={slug} maxLength={180} dir="ltr" onChange={(event) => setSlug(event.target.value)} /></label>
          <label>Author<input value={authorName} maxLength={160} onChange={(event) => setAuthorName(event.target.value)} /></label>
        </section>
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
        <MediaUploader editor={editor} configured={mediaConfigured} />
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

function EditorToolbar({ editor, onImported }: { editor: Editor | null; onImported?: (warnings: string[]) => void }) {
  if (!editor) return <div className={styles.toolbar} role="status">Loading editor…</div>;
  const button = (label: string, active: boolean, action: () => void) => <button type="button" aria-pressed={active} onClick={action}>{label}</button>;
  return <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
    {button("Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
    {button("Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
    {[2, 3, 4].map((level) => button(`H${level}`, editor.isActive("heading", { level }), () => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()))}
    {button("Bullets", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
    {button("Numbers", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
    {button("Quote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
    <LinkDialog editor={editor} />
    <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table</button>
    <button type="button" onClick={() => editor.chain().focus().insertContent({ type: "callout", attrs: { tone: "note" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Callout text" }] }] }).run()}>Callout</button>
    <ImportHtmlDialog editor={editor} onImported={onImported} />
    <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>Undo</button>
    <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>Redo</button>
  </div>;
}

function documentHasBody(document: JSONContent): boolean {
  const visit = (node: JSONContent): boolean => {
    if (node.text?.trim()) return true;
    if (node.type === "image" || node.type === "horizontalRule" || node.type === "codeBlock") return true;
    return (node.content ?? []).some(visit);
  };
  return visit(document);
}

function ImportHtmlDialog({ editor, onImported }: { editor: Editor | null; onImported?: (warnings: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusEditorRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { dialog.showModal(); textareaRef.current?.focus(); }
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function start() {
    setValue(""); setError(""); setOpen(true);
  }

  function finish() {
    setOpen(false);
  }

  async function readFile(file: File) {
    try {
      setValue(await file.text());
      setError("");
    } catch {
      setError("Could not read that file.");
    }
  }

  function apply() {
    if (!editor || !value.trim()) return;
    try {
      const result = importHtmlToDocument(value);
      const hasBody = documentHasBody(editor.getJSON());
      if (hasBody && !window.confirm("Replace the current article body with this HTML?")) return;
      focusEditorRef.current = true;
      editor.chain().setContent(result.document, { emitUpdate: true }).run();
      onImported?.(result.warnings);
      finish();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import HTML");
    }
  }

  return <span className={styles.linkControl}>
    <button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={start}>Import HTML</button>
    <dialog
      ref={dialogRef}
      className={styles.linkDialog}
      aria-label="Import HTML into article body"
      onClose={() => {
        setOpen(false);
        if (focusEditorRef.current) { focusEditorRef.current = false; editor?.commands.focus(); }
        else triggerRef.current?.focus();
      }}
    >
      <label>Article HTML
        <textarea
          ref={textareaRef}
          value={value}
          rows={10}
          maxLength={400_000}
          placeholder="Paste HTML, or choose an .html file"
          onChange={(event) => { setValue(event.target.value); setError(""); }}
        />
      </label>
      <label className={styles.muted}>Or load a file
        <input type="file" accept=".html,text/html" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} />
      </label>
      <p className={styles.muted}>Scripts and external images are removed. Limited text alignment is kept. Import replaces the body after confirmation.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.linkDialogActions}>
        <button type="button" onClick={apply} disabled={!value.trim()}>Import (replace body)</button>
        <button type="button" onClick={finish}>Cancel</button>
      </div>
    </dialog>
  </span>;
}

function LinkDialog({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusEditorRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { dialog.showModal(); inputRef.current?.focus(); }
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function start() {
    if (!editor) return;
    setValue((editor.getAttributes("link").href as string | undefined) ?? "");
    setError("");
    setOpen(true);
  }

  function finish() {
    setOpen(false);
  }

  function resolveHref(raw: string): string | null {
    const trimmed = raw.trim();
    if (/^(https:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
    return `https://${trimmed}`;
  }

  function apply() {
    if (!editor) return;
    const href = resolveHref(value);
    if (href === null) { setError("Use an https, mailto, or tel link."); return; }
    focusEditorRef.current = true;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    finish();
  }

  function remove() {
    if (!editor) return;
    focusEditorRef.current = true;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    finish();
  }

  return <span className={styles.linkControl}>
    <button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={start}>Link</button>
    <dialog
      ref={dialogRef}
      className={styles.linkDialog}
      aria-label="Insert or edit link"
      onClose={() => {
        setOpen(false);
        if (focusEditorRef.current) { focusEditorRef.current = false; editor?.commands.focus(); }
        else triggerRef.current?.focus();
      }}
    >
      <label>Link URL
        <input
          ref={inputRef}
          type="text"
          inputMode="url"
          dir="ltr"
          value={value}
          placeholder="https://example.com"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } }}
        />
      </label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.linkDialogActions}>
        <button type="button" onClick={apply} disabled={!value.trim()}>Apply</button>
        <button type="button" onClick={remove} disabled={!editor?.isActive("link")}>Remove</button>
        <button type="button" onClick={finish}>Cancel</button>
      </div>
    </dialog>
  </span>;
}

async function uploadMediaFile(file: File, onState: (state: string) => void) {
  onState("Checking image…");
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const checksumSha256 = [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const start = await fetch("/api/admin/media/uploads", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType: file.type, byteSize: file.size, checksumSha256 }),
  });
  const grant = await start.json();
  if (!start.ok) throw new Error(grant.error ?? "Could not start upload");
  onState("Uploading…");
  const put = await fetch(grant.uploadUrl, { method: "PUT", headers: grant.requiredHeaders, body: file });
  if (!put.ok) throw new Error(`Object storage rejected the upload (${put.status})`);
  onState("Validating…");
  const complete = await fetch("/api/admin/media/uploads", {
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ completionToken: grant.completionToken }),
  });
  const result = await complete.json();
  if (!complete.ok) throw new Error(result.error ?? "Image validation failed");
  return result as { item: { id: string; width: number; height: number; byteSize: number }; url: string };
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

function MediaUploader({ editor, configured }: { editor: Editor | null; configured: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [state, setState] = useState("");
  async function upload() {
    if (!file || !alt.trim() || !editor) return;
    try {
      const result = await uploadMediaFile(file, setState);
      editor.chain().focus().insertContent({ type: "image", attrs: { src: result.url, alt: alt.trim(), mediaId: result.item.id, width: result.item.width, height: result.item.height } }).run();
      setFile(null); setAlt(""); setState("Image inserted");
    } catch (error) { setState(error instanceof Error ? error.message : "Upload failed"); }
  }
  return <section><h2>Insert image</h2>{configured ? <>
    <label>Image file<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
    <label>Alt text<input value={alt} maxLength={300} onChange={(event) => setAlt(event.target.value)} /></label>
    <button type="button" className={styles.secondaryButton} disabled={!file || !alt.trim()} onClick={upload}>Upload and insert</button>
    {state && <p className={styles.uploadState} role="status">{state}</p>}
  </> : <p className={styles.muted}>Object storage is not configured in this environment.</p>}</section>;
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
