"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { NAV_ITEMS, CTA_LOGIN, CTA_JOIN } from "@/config/nav";
import { LOCALE_META } from "@/config/locales";
import { getLenis } from "@/lib/animation/smoothScroll";
import { Chevron } from "./Chevron";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

/** Mobile bar (logo + hamburger) and a slide-down panel with accordion nav + language. */
export function MobileMenu() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null); // which parent accordion is open
  const [langOpen, setLangOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Locale-aware home URL (default locale has no prefix under `as-needed`).
  const homeHref = locale === routing.defaultLocale ? "/" : `/${locale}`;

  const closeAll = useCallback(() => {
    setOpen(false);
    setOpenKey(null);
    setLangOpen(false);
  }, []);

  // Lock the page while the panel is open. A plain overflow:hidden doesn't hold
  // on mobile Safari, so pin the body with position:fixed at the current scroll
  // offset (and pause Lenis). The panel itself still scrolls internally via
  // data-lenis-prevent. Restore the exact scroll position on close.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const scrollY = window.scrollY;
    getLenis()?.stop();
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.insetInline = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.insetInline = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
      getLenis()?.start();
    };
  }, [open]);

  // Treat the expanded navigation as a keyboard-managed modal: move focus
  // into it, keep Tab within the mobile header, close on Escape, and return
  // focus to the button that opened it.
  useEffect(() => {
    if (!open) return;

    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;

    const getFocusable = (container: HTMLElement) =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.closest("[inert]") && element.offsetParent !== null);

    const focusPanel = () => getFocusable(panel)[0]?.focus();
    const focusFrame = requestAnimationFrame(focusPanel);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAll();
        requestAnimationFrame(() => toggleRef.current?.focus());
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusable(root);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!root.contains(event.target as Node)) focusPanel();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [closeAll, open]);

  function switchTo(next: Locale) {
    router.replace(pathname, { locale: next });
    closeAll();
  }

  return (
    <div
      ref={rootRef}
      className={styles.mobile}
      role={open ? "dialog" : undefined}
      aria-modal={open ? "true" : undefined}
      aria-label={open ? t("mobileMenu") : undefined}
    >
      <div className={styles.mobileBar}>
        {/* Plain anchor (not next Link) so a tap always does a full navigation
            to home — reloading the page even when already on it. */}
        <a href={homeHref} className={styles.logo} aria-label={t("homeLabel")} onClick={closeAll}>
          <Logo />
        </a>
        <button
          ref={toggleRef}
          type="button"
          className={`${styles.hamburger} ${open ? styles.hamburgerOpen : ""}`}
          aria-label={open ? t("closeMenu") : t("openMenu")}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      <div
        ref={panelRef}
        id="mobile-navigation"
        role="navigation"
        aria-label={t("mobileMenu")}
        aria-hidden={!open}
        inert={!open}
        className={`${styles.mobilePanelWrap} ${open ? styles.mobilePanelOpen : ""}`}
        data-lenis-prevent
      >
        <div className={styles.mobilePanel}>
          <div className={styles.mobileList}>
            {NAV_ITEMS.map((item) => (
              <div key={item.key} className={styles.mobileRow}>
                {!item.children?.length && item.href ? (
                  // Leaf link (e.g. FAQ) — no children, just navigate.
                  <Link href={item.href} className={styles.mobileLink} onClick={closeAll}>
                    <span className={styles.mobileText}>{t(item.key)}</span>
                  </Link>
                ) : item.href ? (
                  // Parent with a page of its own: the label navigates; the
                  // chevron button toggles the children.
                  <div className={styles.mobileParent}>
                    <Link
                      href={item.href}
                      className={styles.mobileText}
                      onClick={closeAll}
                    >
                      {t(item.key)}
                    </Link>
                    <button
                      type="button"
                      className={styles.mobileToggle}
                      aria-label={t(item.key)}
                      aria-expanded={openKey === item.key}
                      onClick={() => setOpenKey((k) => (k === item.key ? null : item.key))}
                    >
                      <Chevron className={openKey === item.key ? styles.chevOpen : styles.chev} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.mobileParent}
                    aria-expanded={openKey === item.key}
                    onClick={() => setOpenKey((k) => (k === item.key ? null : item.key))}
                  >
                    <span className={styles.mobileText}>{t(item.key)}</span>
                    <Chevron className={openKey === item.key ? styles.chevOpen : styles.chev} />
                  </button>
                )}
                {!!item.children?.length && (
                  <div
                    className={`${styles.expand} ${openKey === item.key ? styles.expandOpen : ""}`}
                  >
                    <div className={styles.expandInner} inert={openKey !== item.key}>
                      <div className={styles.mobileChildren}>
                        {item.children.map((c) =>
                          c.soon ? (
                            <span
                              key={c.key}
                              aria-disabled="true"
                              className={`${styles.mobileChild} ${styles.mobileChildSoon}`}
                            >
                              {t(c.key)}
                              <span className={styles.soonBadge}>{t("soon")}</span>
                            </span>
                          ) : c.external ? (
                            <a
                              key={c.key}
                              href={c.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.mobileChild}
                              onClick={closeAll}
                            >
                              {t(c.key)}
                            </a>
                          ) : (
                            <Link
                              key={c.key}
                              href={c.href}
                              className={styles.mobileChild}
                              onClick={closeAll}
                            >
                              {t(c.key)}
                            </Link>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

          </div>

          <div className={styles.mobileCtas}>
            <a
              href={CTA_LOGIN.href!}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.mobileCta} ${styles.ctaLogin}`}
              onClick={closeAll}
            >
              <span className={styles.linkText}>{t(CTA_LOGIN.key)}</span>
            </a>
            <a
              href={CTA_JOIN.href!}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.mobileCta} ${styles.ctaJoin}`}
              onClick={closeAll}
            >
              <span className={styles.linkText}>{t(CTA_JOIN.key)}</span>
            </a>
          </div>

          <div className={styles.divider} />

          <div className={styles.accordion}>
            <button
              type="button"
              className={styles.accordionTop}
              aria-expanded={langOpen}
              onClick={() => setLangOpen((o) => !o)}
            >
              <span className={styles.mobileText}>{LOCALE_META[locale].short}</span>
              <Chevron className={langOpen ? styles.chevOpen : styles.chev} />
            </button>
            <div className={`${styles.expand} ${langOpen ? styles.expandOpen : ""}`}>
              <div className={styles.expandInner} inert={!langOpen}>
                <div className={styles.accordionBody}>
                  {langOpen &&
                    routing.locales.map((l) => (
                      <button
                        key={l}
                        type="button"
                        className={`${styles.langItem} ${l === locale ? styles.langActive : ""}`}
                        onClick={() => switchTo(l)}
                      >
                        {LOCALE_META[l].native}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
