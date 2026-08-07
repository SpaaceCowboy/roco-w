"use client";

import styles from "./Tabs.module.css";

export type TabItem = { id: string; label: string };

/**
 * Tabs — reusable brand tab bar. Renders an accessible tablist of pill buttons
 * (active = lime fill); the caller owns the active id + panel. Pass `className`
 * to add layout spacing at the use site.
 */
export function Tabs({
  items,
  active,
  onChange,
  ariaLabel,
  className = "",
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`${styles.tabs} ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={it.id === active}
          className={`${styles.tab} ${it.id === active ? styles.tabActive : ""}`}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
