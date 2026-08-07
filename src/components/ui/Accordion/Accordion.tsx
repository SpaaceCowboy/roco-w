"use client";

import { useId } from "react";
import styles from "./Accordion.module.css";

export type AccordionItem = { id: string; q: string; a: string };

/**
 * Accordion — reusable, CSS-only expander (radio inputs → one panel open at a
 * time via the 0fr→1fr grid trick, chevron rotates). Accessible: each header is
 * a real focusable control and the answer is associated with it. `openFirst`
 * opens the first item by default.
 */
export function Accordion({
  items,
  openFirst = false,
}: {
  items: AccordionItem[];
  openFirst?: boolean;
}) {
  const group = useId();
  return (
    <div className={styles.list}>
      {items.map((it, i) => {
        const id = `${group}-${it.id}`;
        return (
          <div key={it.id} className={styles.item}>
            <input
              className={styles.input}
              type="radio"
              id={id}
              name={group}
              defaultChecked={openFirst && i === 0}
            />
            <label className={styles.label} htmlFor={id}>
              <span>{it.q}</span>
              <span className={styles.chev} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <div className={styles.panel}>
              <div className={styles.panelInner}>
                <p className={styles.answer}>{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
