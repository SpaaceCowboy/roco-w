"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { LOCALE_META } from "@/config/locales";
import { Chevron } from "./Chevron";
import styles from "./Header.module.css";

/** Desktop language dropdown — opens on hover/focus. Switching keeps the page. */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
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

  function switchTo(next: Locale) {
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  return (
    <div
      className={styles.langRoot}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
    >
      <button
        type="button"
        className={`${styles.langToggle} ${open ? styles.langToggleOpen : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.linkText}>{LOCALE_META[locale].short}</span>
        <Chevron className={open ? styles.chevOpen : styles.chev} />
      </button>

      {open && (
        <div className={styles.langList} role="menu">
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              className={`${styles.langItem} ${l === locale ? styles.langActive : ""}`}
              onClick={() => switchTo(l)}
            >
              {LOCALE_META[l].native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
