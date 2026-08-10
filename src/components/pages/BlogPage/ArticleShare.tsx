"use client";

import { useState } from "react";
import styles from "./BlogArticle.module.css";

export function ArticleShare({ title, shareLabel, copyLabel, copiedLabel }: { title: string; shareLabel: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href }).catch(() => undefined);
      return;
    }
    await copy();
  }

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={styles.share}>
      <button onClick={share}>{shareLabel}</button>
      <button onClick={copy} aria-live="polite">{copied ? copiedLabel : copyLabel}</button>
    </div>
  );
}
