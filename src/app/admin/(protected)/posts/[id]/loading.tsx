import styles from "../../../admin.module.css";

export default function EditorLoading() {
  return (
    <main className={styles.editorPage} aria-busy="true" aria-label="Loading article">
      <div className={`${styles.skeleton} ${styles.skeletonToolbar}`} />
      <div className={`${styles.skeleton} ${styles.skeletonTable}`} />
      <span className={styles.srOnly}>Loading article…</span>
    </main>
  );
}
