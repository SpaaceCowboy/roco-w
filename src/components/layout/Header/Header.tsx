import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { NAV_ITEMS, CTA_LOGIN, CTA_JOIN } from "@/config/nav";
import { NavDropdown } from "./NavDropdown";
import { NavCta } from "./NavCta";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

/**
 * Site header, modeled on telkom-ot.si: a translucent blurred pill with a
 * numbered nav, language switcher and CTA on desktop; a hamburger panel on
 * mobile. Reskinned to the RocoBroker brand tokens.
 */
export function Header() {
  const t = useTranslations("nav");
  return (
    <header className={styles.navbar}>
      {/* Desktop */}
      <div className={styles.desktop}>
        <div className={styles.padding}>
          <div className={styles.desktopWrap}>
            <Link href="/" className={styles.logo} aria-label="RocoBroker home">
              <Logo />
            </Link>

            <nav className={styles.menu}>
              {NAV_ITEMS.map((item) => (
                <NavDropdown
                  key={item.key}
                  labelKey={item.key}
                  href={item.href}
                  items={item.children ?? []}
                />
              ))}
              <LanguageSwitcher />
              <NavCta label={t(CTA_LOGIN.key)} href={CTA_LOGIN.href!} external variant="login" />
              <NavCta label={t(CTA_JOIN.key)} href={CTA_JOIN.href!} external variant="join" />
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <MobileMenu />
    </header>
  );
}
