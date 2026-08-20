"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NavChild } from "@/config/nav";
import styles from "./Header.module.css";

type Props = {
  labelKey: string;
  items: NavChild[];
  /** When set, the parent label navigates here on click (dropdown still opens on hover). */
  href?: string;
};

/** Desktop top-level item that reveals a dropdown of children on hover/focus. */
export function NavDropdown({ labelKey, items, href }: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div
      className={styles.dropRoot}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
    >
      {href ? (
        <Link
          href={href}
          className={`${styles.linkItem} ${open ? styles.dropOpen : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className={styles.linkWrap}>
            <span className={styles.linkText}>
              {t(labelKey)}
            </span>
          </span>
        </Link>
      ) : (
        <button
          type="button"
          className={`${styles.linkItem} ${open ? styles.dropOpen : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.linkWrap}>
            <span className={styles.linkText}>
              {t(labelKey)}
            </span>
          </span>
        </button>
      )}

      {open && items.length > 0 && (
        <div className={styles.dropPanel} role="menu">
          {items.map((c) => {
            const label = t(c.key);
            if (c.soon) {
              return (
                <span
                  key={c.key}
                  role="menuitem"
                  aria-disabled="true"
                  className={`${styles.dropItem} ${styles.dropSoon}`}
                >
                  {label}
                  <span className={styles.soonBadge}>{t("soon")}</span>
                </span>
              );
            }
            if (c.external) {
              return (
                <a
                  key={c.key}
                  role="menuitem"
                  className={styles.dropItem}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              );
            }
            return (
              <Link key={c.key} role="menuitem" className={styles.dropItem} href={c.href}>
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
