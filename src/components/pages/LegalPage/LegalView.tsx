"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PageHero } from "@/components/ui/PageHero/PageHero";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import styles from "./LegalPage.module.css";

const EMAIL = "support@rocobroker.com";

/** Legal documents → their organized PDF paths. `id` doubles as the deep-link hash. */
const DOCS = [
  { id: "client-agreement", key: "clientAgreement", file: "/documents/Client-agreement-vol7.pdf" },
  { id: "risk-disclosure", key: "riskDisclosure", file: "/documents/Risk-Disclosure-statement-vol2.pdf" },
  { id: "aml-compliance", key: "aml", file: "/documents/AML_Compliance_Document-vol2-1.pdf" },
  { id: "privacy-policy", key: "privacy", file: "/documents/privecy-policy-vol2.pdf" },
  { id: "social-trade-follower", key: "socialFollower", file: "/documents/Social-trade-follower-agreement.pdf" },
  { id: "social-trade-provider", key: "socialProvider", file: "/documents/social-trade-provider-agreement.pdf" },
  { id: "pamm-agreement", key: "pamm", file: "/documents/PAMM-investor-Manager-agreement-1.pdf" },
] as const;

function OpenIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

/**
 * LegalView — the Legal Documents page. Side-tab document viewer (pattern from
 * the PV_energy legal page, reskinned to our brand): a left rail of document
 * tabs + a company card, and the active document rendered in the right panel as
 * an inline PDF viewer with open/download links. Tabs deep-link by hash so the
 * footer / nav can jump straight to a document.
 */
export function LegalView() {
  const t = useTranslations("legal");
  const [activeId, setActiveId] = useState<string>(DOCS[0].id);

  // Sync the active tab from the URL hash (deep links + back/forward).
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace("#", "");
      if (DOCS.some((d) => d.id === hash)) setActiveId(hash);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const select = useCallback((id: string) => {
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  const active = DOCS.find((d) => d.id === activeId) ?? DOCS[0];

  return (
    <section className={styles.page}>
      <PageBackground />
      <PageHero title={t("title")} overview={t("overview")} />

      <div className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.grid}>
            {/* Left — document tabs + company card. */}
            <aside className={styles.side}>
              <nav className={styles.tabs} role="tablist" aria-label={t("title")} aria-orientation="vertical">
                {DOCS.map((d) => {
                  const isActive = d.id === active.id;
                  return (
                    <button
                      key={d.id}
                      id={`tab-${d.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${d.id}`}
                      className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                      onClick={() => select(d.id)}
                    >
                      <span className={styles.tabDot} aria-hidden="true" />
                      {t(`docs.${d.key}.name`)}
                    </button>
                  );
                })}
              </nav>

              <div className={styles.company}>
                <span className={styles.companyName}>ROCO Broker</span>
                <p className={styles.companyLine}>{t("companyLine")}</p>
                <a className={styles.companyLink} href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </div>
            </aside>

            {/* Right — active document panel (inline PDF viewer). */}
            <article
              id={`panel-${active.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${active.id}`}
              className={styles.panel}
            >
              <p className={styles.languageNotice}>{t("languageNotice")}</p>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>{t(`docs.${active.key}.name`)}</h2>
                  <p className={styles.panelDesc}>{t(`docs.${active.key}.desc`)}</p>
                </div>
                <div className={styles.panelActions}>
                  <a className={styles.action} href={active.file} target="_blank" rel="noopener noreferrer">
                    <OpenIcon />
                    {t("open")}
                  </a>
                  <a className={styles.action} href={active.file} download>
                    <DownloadIcon />
                    {t("download")}
                  </a>
                </div>
              </div>
              <object
                key={active.id}
                className={styles.viewer}
                data={`${active.file}#toolbar=0&navpanes=0&view=Fit`}
                type="application/pdf"
                aria-label={t(`docs.${active.key}.name`)}
              >
                <p className={styles.fallback}>
                  <a href={active.file} target="_blank" rel="noopener noreferrer">
                    {t(`docs.${active.key}.name`)} — {t("open")}
                  </a>
                </p>
              </object>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
