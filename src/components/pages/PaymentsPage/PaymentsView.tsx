"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import {
  CRYPTO_PAYMENT_METHODS,
  FIAT_PAYMENT_METHODS,
  SUPPORTED_FIAT_COUNTRIES,
} from "@/config/payments";
import styles from "./PaymentsPage.module.css";

const REGISTER = "https://my.rocobroker.com/register";

/** Brand marks for the fiat cards. */
function VisaIcon() {
  return (
    <svg viewBox="0 0 48 16" className={styles.brandGlyph} role="img" aria-label="Visa">
      <text
        x="24"
        y="13"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="15"
        letterSpacing="0.5"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}
function MastercardIcon() {
  return (
    <svg viewBox="0 0 40 24" className={styles.brandGlyph} role="img" aria-label="Mastercard">
      <circle cx="15" cy="12" r="9" fill="#EB001B" />
      <circle cx="25" cy="12" r="9" fill="#F79E1B" />
      <path fill="#FF5F00" d="M20 5.2a9 9 0 0 0 0 13.6 9 9 0 0 0 0-13.6" />
    </svg>
  );
}
function PspIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.brandGlyph} aria-hidden="true">
      <path
        fill="#02111B"
        d="M16 3 3 9v2h26V9L16 3Zm-9 10v9H5v3h22v-3h-2v-9h-3v9h-4v-9h-3v9H9v-9H7Z"
      />
    </svg>
  );
}

/** Method data (brand names + networks are universal — kept out of i18n). */
type Method = {
  id: string;
  name: string;
  networks?: readonly string[];
  image?: string;
  Icon?: () => React.JSX.Element;
};
const CRYPTO: readonly Method[] = CRYPTO_PAYMENT_METHODS;
/** Empty image slot — the user drops the real asset in later. */
function ImageSlot({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`${styles.slot} ${className}`.trim()} aria-hidden="true">
      <span className={styles.slotLabel}>{label}</span>
    </div>
  );
}

/**
 * PaymentsView — the Payment Methods subpage. Reuses the Markets shell (dot-grid
 * hero, full-width title + hairline + gradient lead/subtext row, brand Tabs) and
 * the home brand kit (glass cards, guideline points, corner marks, Reveal,
 * chaosBlink). Two tabs — Crypto / Fiat — each with method cards; Fiat adds the
 * supported countries grid. Empty image slots are left for assets. Content from
 * docs/payment-methods-source.md.
 */
export function PaymentsView() {
  const t = useTranslations("paymentsPage");
  const locale = useLocale();
  const rootRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return SUPPORTED_FIAT_COUNTRIES.map(([region, currencies]) => [
      names.of(region) ?? region,
      currencies,
    ] as const);
  }, [locale]);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(([c, cur]) => `${c} ${cur}`.toLowerCase().includes(q));
  }, [countries, query]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chaosBlink(gsap.utils.toArray(`.${styles.micro}`, rootRef.current!));
    },
    { scope: rootRef },
  );

  const sections = [
    {
      key: "crypto",
      micro: t("cryptoMicro"),
      title: t("cryptoTitle"),
      intro: t("cryptoIntro"),
      methods: CRYPTO,
      image: "/payment-methods/crypto.webp",
    },
    {
      key: "fiat",
      micro: t("fiatMicro"),
      title: t("fiatTitle"),
      intro: t("fiatIntro"),
      methods: [
        { ...FIAT_PAYMENT_METHODS.visa, Icon: VisaIcon },
        { ...FIAT_PAYMENT_METHODS.mastercard, Icon: MastercardIcon },
        { ...FIAT_PAYMENT_METHODS.localPsp, name: t("localPspName"), Icon: PspIcon },
      ] satisfies Method[],
      image: "/payment-methods/fiat.webp",
    },
  ];

  return (
    <section ref={rootRef} className={styles.page}>
      {/* Hero band — dark, dot-grid, corner frame (Markets pattern). */}
      <div className={styles.hero}>
        <div className={styles.dots} aria-hidden="true">
          <DotMatrix speed={0.02} delay={0.2} opacity={0.5} color="#727d85" />
        </div>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          <Reveal as="h1" variant="slide" className={styles.title}>
            {t("title")}
          </Reveal>

          <div className={styles.hair} />

          <div className={styles.introRow}>
            <div className={styles.introLeft}>
              <div className={styles.introLeadBlock}>
                <Reveal as="h2" variant="slide" className={styles.lead}>
                  {t("lead")} <span className={styles.leadAccent}>{t("leadAccent")}</span>
                </Reveal>
                <Button label={t("cta")} href={REGISTER} external />
              </div>
            </div>
            <Reveal as="p" variant="flicker" className={styles.sub}>
              {t("sub")}
            </Reveal>
          </div>
        </div>
      </div>

      {/* Method sections, stacked one under another (crypto, then fiat) */}
      <div id="methods" className={styles.body}>
        <div className={styles.inner}>
          {sections.map((sec) => (
            <div key={sec.key} className={styles.panel}>
              <div
                className={`${styles.panelTop} ${sec.key === "fiat" ? styles.panelTopMirror : ""}`}
              >
                <div className={styles.panelText}>
                  <div className={styles.microRow}>
                    <span className={styles.microBlock} />
                    <span className={styles.micro}>{sec.micro}</span>
                  </div>
                  <h3 className={styles.catTitle}>
                    <span className={styles.catAccent}>{sec.title}</span>
                  </h3>
                  <p className={styles.intro}>{sec.intro}</p>
                </div>

                {sec.image ? (
                  <figure className={`${styles.panelMedia} ${styles.mediaFrame}`}>
                    <Image
                      className={styles.mediaImg}
                      src={sec.image}
                      alt=""
                      aria-hidden="true"
                      width={1200}
                      height={sec.key === "fiat" ? 1057 : 900}
                      sizes="(max-width: 900px) 100vw, 50vw"
                    />
                  </figure>
                ) : (
                  <ImageSlot label={t("imageLabel")} className={styles.panelMedia} />
                )}
              </div>

              {/* Method cards */}
              <div className={styles.cards}>
                {sec.methods.map((mth) => (
                  <article key={mth.id} className={styles.card}>
                    {mth.image ? (
                      <figure className={styles.cardMedia}>
                        <Image
                          className={styles.cardMediaImg}
                          src={mth.image}
                          alt={mth.name}
                          width={900}
                          height={600}
                          sizes="(max-width: 600px) 100vw, 320px"
                        />
                      </figure>
                    ) : (
                      <div className={styles.brandRow}>
                        <span className={styles.brandLogo}>{mth.Icon && <mth.Icon />}</span>
                        <span className={styles.brandText}>
                          <span className={styles.cardName}>{mth.name}</span>
                          <span className={styles.cardSub}>{t(`fiatSub.${mth.id}`)}</span>
                        </span>
                      </div>
                    )}
                    {mth.networks && (
                      <div className={styles.networks}>
                        {mth.networks.map((n) => (
                          <span key={n} className={styles.network}>
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {/* Fiat only: supported countries + currencies (searchable) */}
              {sec.key === "fiat" && (
                <div className={styles.countries}>
                  <div className={styles.countriesHead}>
                    <div className={styles.countriesHeadLeft}>
                      <span className={styles.microBlock} />
                      <h4 className={styles.countriesTitle}>{t("countriesLabel")}</h4>
                      <span className={styles.countriesCount}>{filteredCountries.length}</span>
                    </div>
                    <input
                      type="search"
                      className={styles.search}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                      aria-label={t("searchPlaceholder")}
                    />
                  </div>

                  {filteredCountries.length ? (
                    <ul className={styles.countryGrid}>
                      {filteredCountries.map(([country, cur]) => (
                        <li key={country} className={styles.country}>
                          <span className={styles.countryName}>{country}</span>
                          <span className={styles.countryCur}>{cur}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.noResults}>{t("noResults")}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
