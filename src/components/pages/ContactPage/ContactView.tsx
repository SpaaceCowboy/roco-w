"use client";

import { useState, type SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PageHero } from "@/components/ui/PageHero/PageHero";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Button } from "@/components/ui/Button/Button";
import { WhatsAppIcon, TelegramIcon, InstagramIcon, LinkedInIcon } from "@/components/layout/Footer/icons";
import { CONTACT } from "@/config/contact";
import styles from "./ContactPage.module.css";

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
 * form posts to the server-side contact endpoint, which delivers the message
 * without exposing provider credentials to the browser.
 */
type FieldName = "name" | "email" | "subject" | "department" | "message";
type FormStatus = "idle" | "submitting" | "success" | "error" | "rateLimited";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactView() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: "",
    email: "",
    subject: "",
    department: "",
    message: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  const fieldError = (name: FieldName): string => {
    const v = values[name].trim();
    if (!v) return t("errRequired");
    if (name === "email" && !EMAIL_RE.test(v)) return t("errEmail");
    return "";
  };
  const isValid = (["name", "email", "subject", "department", "message"] as FieldName[]).every(
    (n) => !fieldError(n),
  );
  const set = (name: FieldName, v: string) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (status === "success" || status === "error" || status === "rateLimited") setStatus("idle");
  };
  const blur = (name: FieldName) => setTouched((s) => ({ ...s, [name]: true }));

  const channels = [
    { label: t("email"), value: CONTACT.email, href: `mailto:${CONTACT.email}`, Icon: MailIcon },
    { label: t("phone"), value: CONTACT.phone.display, href: `tel:${CONTACT.phone.e164}`, Icon: PhoneIcon },
    { label: t("whatsapp"), value: CONTACT.whatsapp.display, href: CONTACT.whatsapp.url, Icon: WhatsAppIcon },
    { label: t("telegram"), value: CONTACT.telegram.handle, href: CONTACT.telegram.url, Icon: TelegramIcon },
  ];
  const socials = [
    { label: "Instagram", href: CONTACT.social.instagram, Icon: InstagramIcon },
    { label: "LinkedIn", href: CONTACT.social.linkedin, Icon: LinkedInIcon },
    { label: "WhatsApp", href: CONTACT.whatsapp.url, Icon: WhatsAppIcon },
    { label: "Telegram", href: CONTACT.telegram.url, Icon: TelegramIcon },
  ];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    if (!isValid) {
      setTouched({ name: true, email: true, subject: true, department: true, message: true });
      return;
    }

    const form = e.currentTarget;
    const website = String(new FormData(form).get("website") ?? "");
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: crypto.randomUUID(),
          ...values,
          locale,
          website,
        }),
      });
      // 429 is the per-IP submission brake, not a delivery failure — tell the
      // visitor to wait rather than sending them to the fallback channels.
      if (response.status === 429) {
        setStatus("rateLimited");
        return;
      }
      if (!response.ok) throw new Error(`Contact request failed with ${response.status}`);

      setValues({ name: "", email: "", subject: "", department: "", message: "" });
      setTouched({});
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
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
                  {CONTACT.offices.map((o) => (
                    <p key={o} className={styles.addr}>{o}</p>
                  ))}
                </div>
                <div>
                  <span className={styles.addrLabel}>{t("regLabel")}</span>
                  <p className={styles.addr}>{CONTACT.registeredAddress}</p>
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
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <span className={styles.kicker}>{t("formKicker")}</span>
              <div className={styles.honeypot} aria-hidden="true">
                <label>
                  Website
                  <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
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
                        maxLength={name === "email" ? 254 : name === "subject" ? 150 : 100}
                        autoComplete={name === "name" ? "name" : name === "email" ? "email" : undefined}
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
                    <option value="support">{t("deptSupport")}</option>
                    <option value="marketing">{t("deptMarketing")}</option>
                    <option value="hr">{t("deptHr")}</option>
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
                    maxLength={5000}
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
              <Button
                label={status === "submitting" ? t("sending") : t("submit")}
                type="submit"
                disabled={!isValid || status === "submitting"}
              />
              <div className={styles.status} aria-live="polite" aria-atomic="true">
                {status === "success" && (
                  <p className={styles.statusSuccess} role="status">{t("success")}</p>
                )}
                {status === "rateLimited" && (
                  <p className={styles.statusError} role="alert">{t("tooMany")}</p>
                )}
                {status === "error" && (
                  <p className={styles.statusError} role="alert">{t("sendError")}</p>
                )}
              </div>
              <p className={styles.restriction}>{t("restriction")}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
