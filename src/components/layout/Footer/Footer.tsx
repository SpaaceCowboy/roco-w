import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { InstagramIcon, LinkedInIcon, WhatsAppIcon, MailIcon } from "./icons";
import { CookieSettingsButton } from "@/components/ui/CookieConsent/CookieSettingsButton";
import { COMPLIANCE, COMPLIANCE_MESSAGE_VALUES } from "@/config/compliance";
import { CONTACT } from "@/config/contact";
import styles from "./Footer.module.css";

const MT5 = {
  ios: "https://apps.apple.com/app/metatrader-5/id413251709",
  android: "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5",
  windows: "https://www.metatrader5.com/en/download",
  mac: "https://www.metatrader5.com/en/download/mac",
  web: "https://www.metatrader5.com/en/terminal/web",
};

/**
 * Footer — dark site footer modelled on rocobroker.com: brand + tagline and
 * social links, an MT5 download column, quick links, and a contact column with
 * WhatsApp / Telegram QR codes. Closes with the risk warning, licensing, and
 * copyright. Server component (no client interactivity).
 */
export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  const download = [
    { label: "App Store", href: MT5.ios },
    { label: "Google Play", href: MT5.android },
    { label: "Windows", href: MT5.windows },
    { label: "Mac", href: MT5.mac },
    { label: "Web Terminal", href: MT5.web },
  ];

  const quick = [
    { label: t("accounts"), href: "/accounts" },
    { label: nav("metatrader5"), href: "/platforms/metatrader-5" },
    { label: nav("legalDocuments"), href: "/legal-documents" },
    { label: nav("forexTrading"), href: "/markets/forex" },
    { label: nav("commodities"), href: "/markets/commodities" },
    { label: nav("metals"), href: "/markets/metals" },
    { label: nav("crypto"), href: "/markets/crypto" },
    { label: nav("stocks"), href: "/markets/stocks" },
    { label: nav("indices"), href: "/markets/indices" },
  ];

  const social = [
    { label: "Instagram", href: CONTACT.social.instagram, Icon: InstagramIcon },
    { label: "LinkedIn", href: CONTACT.social.linkedin, Icon: LinkedInIcon },
    { label: "WhatsApp", href: CONTACT.whatsapp.url, Icon: WhatsAppIcon },
    { label: t("emailLabel"), href: `mailto:${CONTACT.email}`, Icon: MailIcon },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          {/* Brand + tagline + social */}
          <div className={styles.brandCol}>
            <span className={styles.brand}>ROCO</span>
            <p className={styles.tagline}>{t("tagline")}</p>
            <div className={styles.social} aria-label={t("followUs")}>
              {social.map(({ label, href, Icon }) => {
                const isMail = href.startsWith("mailto:");
                return (
                  <a
                    key={label}
                    href={href}
                    className={styles.socialLink}
                    aria-label={label}
                    target={isMail ? undefined : "_blank"}
                    rel={isMail ? undefined : "noopener noreferrer"}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Download MetaTrader 5 */}
          <nav className={styles.linkCol} aria-label={t("colDownload")}>
            <h3 className={styles.colTitle}>{t("colDownload")}</h3>
            <ul className={styles.links}>
              {download.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick links */}
          <nav className={styles.linkCol} aria-label={t("colLinks")}>
            <h3 className={styles.colTitle}>{t("colLinks")}</h3>
            <ul className={styles.links}>
              {quick.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact + QR codes */}
          <div className={styles.contactCol}>
            <h3 className={styles.colTitle}>{t("colContact")}</h3>
            <div className={styles.qrRow}>
              <figure className={styles.qr}>
                <Image
                  src="/shared/qr-whatsapp.webp"
                  alt={`${t("whatsapp")} QR code`}
                  width={110}
                  height={110}
                  sizes="100px"
                />
                <figcaption>{t("whatsapp")}</figcaption>
              </figure>
              <figure className={styles.qr}>
                <Image
                  src="/shared/qr-telegram.webp"
                  alt={`${t("telegram")} QR code`}
                  width={110}
                  height={110}
                  sizes="100px"
                />
                <figcaption>{t("telegram")}</figcaption>
              </figure>
            </div>
            <ul className={styles.contactList}>
              <li>
                <span className={styles.contactLabel}>{t("emailLabel")}</span>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>
                <span className={styles.contactLabel}>{t("phoneLabel")}</span>
                <a href={`tel:${CONTACT.phone.e164}`}>{CONTACT.phone.display}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Addresses */}
        <div className={styles.addresses}>
          <p>
            <span className={styles.contactLabel}>{t("officesLabel")}</span>
            {CONTACT.offices.join(" · ")}
          </p>
          <p>
            <span className={styles.contactLabel}>{t("regLabel")}</span>
            {CONTACT.registeredAddress}
          </p>
        </div>

        {/* Legal + copyright */}
        <div className={styles.legal}>
          <p className={styles.risk}>{t("risk")}</p>
          <p className={styles.license}>
            {t("license", COMPLIANCE_MESSAGE_VALUES)}{" "}
            <a href={COMPLIANCE.registryUrl} target="_blank" rel="noopener noreferrer">
              {t("verifyLicense")}
            </a>
          </p>
          <p className={styles.copyright} suppressHydrationWarning>
            © {new Date().getFullYear()} ROCO Broker. {t("rights")}{" "}
            <CookieSettingsButton className={styles.cookieSettings} />
          </p>
        </div>
      </div>
    </footer>
  );
}
