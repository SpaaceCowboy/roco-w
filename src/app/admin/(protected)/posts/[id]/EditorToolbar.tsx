"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import { useEffect, useRef, useState } from "react";
import { trackImageUploadTarget } from "@/lib/content/editor/image-upload-target";
import { importHtmlToDocument } from "@/lib/content/editor/html-import";
import type { ContentLocale } from "@/lib/admin/content-locales";
import styles from "../../../admin.module.css";
import { Icon, type IconName } from "./EditorIcons";
import { uploadMediaFile } from "./media-upload";

function resolveEditorHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^(?:\/(?!\/)|[?#]|\.\.?\/)/.test(trimmed)) return trimmed;
  if (/^(https:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return trimmed ? `https://${trimmed}` : null;
}

export function EditorToolbar({ editor, locale, mediaConfigured, onImported }: { editor: Editor | null; locale: ContentLocale; mediaConfigured: boolean; onImported?: (warnings: string[]) => void }) {
  if (!editor) return <div className={styles.toolbar} role="status">Loading editor…</div>;
  const button = (label: string, icon: IconName | null, active: boolean | undefined, action: () => void) =>
    <button key={label} type="button" title={label} aria-label={label} aria-pressed={active} onClick={action}>{icon ? <Icon name={icon} /> : label}</button>;
  return <div className={styles.toolbar} role="toolbar" aria-label="Text formatting" dir="ltr">
    <div className={styles.toolbarGroup} role="group" aria-label="Text style">
    {button("Bold", "bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
    {button("Italic", "italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
    {[2, 3, 4].map((level) => button(`H${level}`, null, editor.isActive("heading", { level }), () => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()))}
    </div>
    <div className={styles.toolbarGroup} role="group" aria-label="Lists and quotes">
    {button("Bulleted list", "list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
    {button("Numbered list", "listOrdered", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
    {button("Quote", "quote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
    </div>
    <div className={styles.toolbarGroup} role="group" aria-label="Insert content">
    <LinkDialog editor={editor} />
    <InsertImageDialog editor={editor} configured={mediaConfigured} />
    <ImageDialog editor={editor} />
    {button("Table", "table", undefined, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
    {button("Callout", "callout", undefined, () => editor.chain().focus().insertContent({ type: "callout", attrs: { tone: "note" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Callout text" }] }] }).run())}
    <CtaDialog editor={editor} locale={locale} />
    <ImportHtmlDialog editor={editor} onImported={onImported} />
    </div>
  </div>;
}

type CtaValues = {
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

function defaultCtaValues(locale: ContentLocale): CtaValues {
  const prefix = `/${locale}`;
  if (locale === "fa") {
    return {
      heading: "آماده معامله هستید؟",
      body: "برای شروع، حساب معاملاتی خود را افتتاح کنید.",
      primaryLabel: "افتتاح حساب معاملاتی",
      primaryHref: `${prefix}/accounts`,
      secondaryLabel: "تماس با ما",
      secondaryHref: `${prefix}/contact`,
    };
  }
  return {
    heading: "Ready to start trading?",
    body: "Open a trading account to get started.",
    primaryLabel: "Open an account",
    primaryHref: `${prefix}/accounts`,
    secondaryLabel: "Contact us",
    secondaryHref: `${prefix}/contact`,
  };
}

function CtaDialog({ editor, locale }: { editor: Editor | null; locale: ContentLocale }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CtaValues>(() => defaultCtaValues(locale));
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusEditorRef = useRef(false);
  const active = Boolean(editor?.isActive("articleCta"));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { dialog.showModal(); firstInputRef.current?.focus(); }
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function start() {
    if (!editor) return;
    const attrs = editor.getAttributes("articleCta") as Partial<CtaValues>;
    setValues(active ? { ...defaultCtaValues(locale), ...attrs } : defaultCtaValues(locale));
    setError("");
    setOpen(true);
  }

  function update<K extends keyof CtaValues>(key: K, value: CtaValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function finish() {
    setOpen(false);
  }

  function apply() {
    if (!editor) return;
    const next = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])) as CtaValues;
    if (!next.heading || !next.body || !next.primaryLabel || !next.secondaryLabel) {
      setError("Add a heading, body, and both button labels.");
      return;
    }
    const primaryHref = resolveEditorHref(next.primaryHref);
    const secondaryHref = resolveEditorHref(next.secondaryHref);
    if (!primaryHref || !secondaryHref) {
      setError("Use internal paths or HTTPS, mailto, or tel links for both buttons.");
      return;
    }
    const attrs = { ...next, primaryHref, secondaryHref };
    focusEditorRef.current = true;
    if (active) editor.chain().focus().updateAttributes("articleCta", attrs).run();
    else editor.chain().focus().insertContent({ type: "articleCta", attrs }).run();
    finish();
  }

  return <span className={styles.linkControl}>
    <button ref={triggerRef} type="button" aria-haspopup="dialog" title={active ? "Edit CTA" : "Call to action"} aria-pressed={active} onClick={start}><Icon name="cta" /><span className={styles.srOnly}>{active ? "Edit CTA" : "CTA"}</span></button>
    <dialog
      ref={dialogRef}
      className={`${styles.linkDialog} ${styles.ctaDialog}`}
      aria-label={active ? "Edit article call to action" : "Add article call to action"}
      onClose={() => {
        setOpen(false);
        if (focusEditorRef.current) { focusEditorRef.current = false; editor?.commands.focus(); }
        else triggerRef.current?.focus();
      }}
    >
      <label>Heading<input ref={firstInputRef} value={values.heading} maxLength={160} onChange={(event) => update("heading", event.target.value)} /></label>
      <label>Body<textarea value={values.body} rows={3} maxLength={500} onChange={(event) => update("body", event.target.value)} /></label>
      <div className={styles.ctaFields}>
        <label>Primary button label<input value={values.primaryLabel} maxLength={80} onChange={(event) => update("primaryLabel", event.target.value)} /></label>
        <label>Primary button URL<input value={values.primaryHref} maxLength={2_000} dir="ltr" onChange={(event) => update("primaryHref", event.target.value)} /></label>
        <label>Secondary button label<input value={values.secondaryLabel} maxLength={80} onChange={(event) => update("secondaryLabel", event.target.value)} /></label>
        <label>Secondary button URL<input value={values.secondaryHref} maxLength={2_000} dir="ltr" onChange={(event) => update("secondaryHref", event.target.value)} /></label>
      </div>
      <p className={styles.muted}>Both buttons are required. Internal paths and HTTPS, mailto, or tel links are supported.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.linkDialogActions}>
        <button type="button" onClick={apply}>{active ? "Update CTA" : "Insert CTA"}</button>
        <button type="button" onClick={finish}>Cancel</button>
      </div>
    </dialog>
  </span>;
}

function documentHasBody(document: JSONContent): boolean {
  const visit = (node: JSONContent): boolean => {
    if (node.text?.trim()) return true;
    if (node.type === "image" || node.type === "horizontalRule" || node.type === "codeBlock" || node.type === "articleCta") return true;
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
      const result = importHtmlToDocument(value, generateJSON);
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
    <button ref={triggerRef} type="button" aria-haspopup="dialog" title="Import HTML" onClick={start}><Icon name="import" /><span className={styles.srOnly}>Import HTML</span></button>
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
  const activeHref = ((editor?.getAttributes("link").href as string | undefined) ?? "").trim();

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

  function apply() {
    if (!editor) return;
    const href = resolveEditorHref(value);
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
    <button ref={triggerRef} type="button" aria-haspopup="dialog" title={activeHref ? "Edit link" : "Link"} aria-pressed={Boolean(activeHref)} onClick={start}><Icon name="link" /><span className={styles.srOnly}>{activeHref ? "Edit link" : "Link"}</span></button>
    {activeHref && <span className={styles.linkDestination} dir="ltr" title={activeHref}><span className={styles.srOnly}>Current link: </span>{activeHref}</span>}
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

function ImageDialog({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusEditorRef = useRef(false);
  const active = Boolean(editor?.isActive("image"));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { dialog.showModal(); altInputRef.current?.focus(); }
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function start() {
    if (!editor || !active) return;
    const attrs = editor.getAttributes("image") as { alt?: string; title?: string };
    setAlt(attrs.alt ?? "");
    setTitle(attrs.title ?? "");
    setError("");
    setOpen(true);
  }

  function finish() {
    setOpen(false);
  }

  function apply() {
    if (!editor) return;
    const nextAlt = alt.trim();
    if (!nextAlt) { setError("Alt text is required for every article image."); return; }
    focusEditorRef.current = true;
    editor.chain().focus().updateAttributes("image", { alt: nextAlt, title: title.trim() || null }).run();
    finish();
  }

  function remove() {
    if (!editor || !window.confirm("Remove this image from the article? The uploaded media file will remain available.")) return;
    focusEditorRef.current = true;
    editor.chain().focus().deleteSelection().run();
    finish();
  }

  return <span className={styles.linkControl}>
    {(active || open) && <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-pressed={active} title="Edit image details" onClick={start}><Icon name="pencil" /><span className={styles.srOnly}>Edit image</span></button>}
    <dialog
      ref={dialogRef}
      className={styles.linkDialog}
      aria-label="Edit inline image"
      onClose={() => {
        setOpen(false);
        if (focusEditorRef.current) { focusEditorRef.current = false; editor?.commands.focus(); }
        else triggerRef.current?.focus();
      }}
    >
      <label>Alt text<input ref={altInputRef} value={alt} maxLength={300} onChange={(event) => { setAlt(event.target.value); setError(""); }} /></label>
      <label>Image title (optional)<input value={title} maxLength={300} onChange={(event) => setTitle(event.target.value)} /></label>
      <p className={styles.muted}>The uploaded media reference and source are preserved when you update the description.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.linkDialogActions}>
        <button type="button" onClick={apply}>Update image</button>
        <button type="button" onClick={remove}>Remove from article</button>
        <button type="button" onClick={finish}>Cancel</button>
      </div>
    </dialog>
  </span>;
}

/** Upload a new image into the article, or replace the selected one. */
function InsertImageDialog({ editor, configured }: { editor: Editor | null; configured: boolean }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const insertedRef = useRef(false);
  const replacing = Boolean(editor?.isActive("image"));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function start() {
    setFile(null); setAlt(""); setState("");
    setOpen(true);
  }

  async function upload() {
    if (!file || !alt.trim() || !editor || busy) return;
    const target = editor.isActive("image") ? trackImageUploadTarget(editor) : null;
    setBusy(true);
    try {
      const result = await uploadMediaFile(file, setState);
      const attrs = { src: result.url, alt: alt.trim(), title: null, mediaId: result.item.id, width: result.item.width, height: result.item.height };
      const selectedImagePosition = target?.resolve() ?? null;
      if (target && selectedImagePosition === null) {
        setState("The selected image was removed or edited during upload. Select an image and try again.");
        return;
      }
      if (selectedImagePosition !== null) editor.chain().focus().setNodeSelection(selectedImagePosition).updateAttributes("image", attrs).run();
      else editor.chain().focus().insertContent({ type: "image", attrs }).run();
      insertedRef.current = true;
      setOpen(false);
    } catch (error) {
      setState(error instanceof Error ? error.message : "Upload failed");
    } finally {
      target?.dispose();
      setBusy(false);
    }
  }

  return <span className={styles.linkControl}>
    <button ref={triggerRef} type="button" aria-haspopup="dialog" disabled={!configured} title={configured ? (replacing ? "Replace image" : "Insert image") : "Object storage is not configured in this environment"} onClick={start}>
      <Icon name="image" /><span className={styles.srOnly}>{replacing ? "Replace image" : "Insert image"}</span>
    </button>
    <dialog ref={dialogRef} className={styles.linkDialog} aria-label={replacing ? "Replace selected image" : "Insert image"} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => {
      setOpen(false);
      if (insertedRef.current) { insertedRef.current = false; editor?.commands.focus(); }
      else triggerRef.current?.focus();
    }}>
      <label>Image file<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <label>Alt text<input value={alt} maxLength={300} onChange={(event) => setAlt(event.target.value)} /></label>
      {state && <p className={styles.uploadState} role="status">{state}</p>}
      <div className={styles.linkDialogActions}>
        <button type="button" disabled={!file || !alt.trim() || busy} onClick={upload}>{busy ? "Uploading…" : replacing ? "Upload and replace" : "Upload and insert"}</button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </dialog>
  </span>;
}

/** Undo/redo live beside the editing-mode switch, outside the formatting toolbar. */
export function HistoryControls({ editor }: { editor: Editor }) {
  return <>
      <div className={styles.toolbarGroup} role="group" aria-label="History">
      <button type="button" title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Icon name="undo" /><span className={styles.srOnly}>Undo</span></button>
      <button type="button" title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Icon name="redo" /><span className={styles.srOnly}>Redo</span></button>
      </div>
  </>;
}
