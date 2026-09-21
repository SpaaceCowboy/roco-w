"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "../admin.module.css";

/**
 * Native `<details>` popover that closes on outside click or Escape. Kept
 * uncontrolled so the browser owns the open state; the listeners only close it.
 */
export function Popover({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const details = ref.current;
      if (details?.open && !details.contains(event.target as Node)) details.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && ref.current?.open) ref.current.open = false;
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className={styles.filterDetails}>
      <summary className={styles.ghostButton}>{summary}</summary>
      {children}
    </details>
  );
}
