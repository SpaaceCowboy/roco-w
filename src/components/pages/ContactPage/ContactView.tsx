"use client";

import { useState, type SVGProps } from "react";
import { useTranslations } from "next-intl";
import { PageHero } from "@/components/ui/PageHero/PageHero";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Button } from "@/components/ui/Button/Button";
import { WhatsAppIcon, TelegramIcon, InstagramIcon, LinkedInIcon } from "@/components/layout/Footer/icons";
import styles from "./ContactPage.module.css";

const EMAIL = "support@rocobroker.com";
const PHONE = "+447401131099";
const WHATSAPP =
  "https://api.whatsapp.com/send/?phone=%2B447723179486&text&type=phone_number&app_absent=0";
const TELEGRAM = "https://t.me/RocoBrokersupport";
const INSTAGRAM = "https://www.instagram.com/rocobroker/";
const LINKEDIN = "https://www.linkedin.com/company/rocobroker/";
const OFFICES = [
  "147 Blv Svetog Petra Cetinjskog UI 2 Sp 3 St 5, Podgorica, Montenegro, 81000",
  "Concord Business Center, 334 90th South Street, New Cairo, Egypt",
];
const REGISTERED = "Bonovo Road, Fomboni, Island of Mohéli, Comoros Union";

function MailIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}
function PhoneIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <path d="M4 5c0-.6.4-1 1-1h2.3c.5 0 .9.3 1 .8l.8 3c.1.4 0 .8-.3 1L7.5 10.5a12 12 0 0 0 6 6l1.7-1.3c.3-.2.7-.3 1-.2l3 .8c.5.1.8.5.8 1V19c0 .6-.4 1-1 1A15 15 0 0 1 4 5Z" />
    </svg>
  );
}

/**
 * ContactView — the Contact page (adapted from the PV_energy contact pattern,
 * reskinned to our brand): reusable <PageHero>, then a two-column body with the
 * contact channels + offices on the left and a message form on the right. The
 * form composes a mailto to support so it works without a backend.
 */
type FieldName = "name" | "email" | "subject" | "department" | "message";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactView() {
  const t = useTranslations("contact");
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: "",
    email: "",
    subject: "",
    department: "",
    message: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const fieldError = (name: FieldName): string => {
    const v = values[name].trim();
    if (!v) return t("errRequired");
    if (name === "email" && !EMAIL_RE.test(v)) return t("errEmail");
    return "";
  };
  const isValid = (["name", "email", "subject", "department", "message"] as FieldName[]).every(
    (n) => !fieldError(n),
  );
  const set = (name: FieldName, v: string) => setValues((s) => ({ ...s, [name]: v }));
  const blur = (name: FieldName) => setTouched((s) => ({ ...s, [name]: true }));

  const channels = [
    { label: t("email"), value: EMAIL, href: `mailto:${EMAIL}`, Icon: MailIcon },
    { label: t("phone"), value: PHONE, href: `tel:${PHONE}`, Icon: PhoneIcon },
    { label: t("whatsapp"), value: "+44 7723 179486", href: WHATSAPP, Icon: WhatsAppIcon },
    { label: t("telegram"), value: "@RocoBrokersupport", href: TELEGRAM, Icon: TelegramIcon },
  ];
  const socials = [
    { label: "Instagram", href: INSTAGRAM, Icon: InstagramIcon },
    { label: "LinkedIn", href: LINKEDIN, Icon: LinkedInIcon },
    { label: "WhatsApp", href: WHATSAPP, Icon: WhatsAppIcon },
    { label: "Telegram", href: TELEGRAM, Icon: TelegramIcon },
  ];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) {
      setTouched({ name: true, email: true, subject: true, department: true, message: true });
      return;
    }
    const body =
      `${t("fName")}: ${values.name}\n` +
      `${t("fEmail")}: ${values.email}\n` +
      `${t("fDepartment")}: ${values.department}\n\n` +
      `${values.message}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className={styles.page}>
      <PageBackground />
      <PageHero title={t("title")} overview={t("overview")} />

      <div className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.grid}>
            {/* Left — channels, offices, socials. */}
            <div className={styles.info}>
              <span className={styles.kicker}>{t("reachKicker")}</span>
              <ul className={styles.channels}>
                {channels.map(({ label, value, href, Icon }) => (
                  <li key={label}>
                    <a
                      className={styles.channel}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      <span className={styles.channelIcon}>
                        <Icon />
                      </span>
                      <span className={styles.channelText}>
                        <span className={styles.channelLabel}>{label}</span>
                        <span className={styles.channelValue}>{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className={styles.addresses}>
                <div>
                  <span className={styles.addrLabel}>{t("officesLabel")}</span>
                  {OFFICES.map((o) => (
                    <p key={o} className={styles.addr}>{o}</p>
                  ))}
                </div>
                <div>
                  <span className={styles.addrLabel}>{t("regLabel")}</span>
                  <p className={styles.addr}>{REGISTERED}</p>
                </div>
              </div>

              <div className={styles.socials}>
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    className={styles.social}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Right — message form. */}
            <form className={styles.form} onSubmit={onSubmit}>
              <span className={styles.kicker}>{t("formKicker")}</span>
              <div className={styles.fields}>
                {(
                  [
                    { name: "name" as const, label: t("fName"), type: "text" },
                    { name: "email" as const, label: t("fEmail"), type: "email" },
                    { name: "subject" as const, label: t("fSubject"), type: "text" },
                  ]
                ).map(({ name, label, type }) => {
                  const err = touched[name] ? fieldError(name) : "";
                  return (
                    <label key={name} className={styles.field}>
                      <span className={styles.fieldLabel}>{label}</span>
                      <input
                        className={`${styles.input} ${err ? styles.inputError : ""}`}
                        name={name}
                        type={type}
                        value={values[name]}
                        onChange={(e) => set(name, e.target.value)}
                        onBlur={() => blur(name)}
                        aria-invalid={!!err}
                      />
                      {err && <span className={styles.errorMsg}>{err}</span>}
                    </label>
                  );
                })}
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{t("fDepartment")}</span>
                  <select
                    className={`${styles.input} ${touched.department && fieldError("department") ? styles.inputError : ""}`}
                    name="department"
                    value={values.department}
                    onChange={(e) => set("department", e.target.value)}
                    onBlur={() => blur("department")}
                    aria-invalid={!!(touched.department && fieldError("department"))}
                  >
                    <option value="" disabled>
                      {t("selectDept")}
                    </option>
                    <option value={t("deptSupport")}>{t("deptSupport")}</option>
                    <option value={t("deptMarketing")}>{t("deptMarketing")}</option>
                    <option value={t("deptHr")}>{t("deptHr")}</option>
                  </select>
                  {touched.department && fieldError("department") && (
                    <span className={styles.errorMsg}>{fieldError("department")}</span>
                  )}
                </label>
                <label className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>{t("fMessage")}</span>
                  <textarea
                    className={`${styles.input} ${touched.message && fieldError("message") ? styles.inputError : ""}`}
                    name="message"
                    rows={5}
                    value={values.message}
                    onChange={(e) => set("message", e.target.value)}
                    onBlur={() => blur("message")}
                    aria-invalid={!!(touched.message && fieldError("message"))}
                  />
                  {touched.message && fieldError("message") && (
                    <span className={styles.errorMsg}>{fieldError("message")}</span>
                  )}
                </label>
              </div>
              <Button label={t("submit")} type="submit" disabled={!isValid} />
              <p className={styles.restriction}>{t("restriction")}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
