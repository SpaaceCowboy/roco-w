"use client";

import styles from "../admin.module.css";

/** Last-resort boundary for any admin route. `digest` is Next's server-side log correlation id. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="admin-main" className={styles.mainInner}>
      <section className={styles.dashboardError} role="alert">
        <p className={styles.eyebrow}>Something went wrong</p>
        <h1>This page could not be shown</h1>
        <p>No changes were saved from this screen. Try again, and quote the reference if it keeps happening.</p>
        <div className={styles.errorActions}>
          <button type="button" className={styles.primaryButton} onClick={reset}>Try again</button>
          {error.digest && <span>Support reference: <code>{error.digest}</code></span>}
        </div>
      </section>
    </main>
  );
}
