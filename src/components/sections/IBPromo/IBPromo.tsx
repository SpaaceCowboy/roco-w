import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
import { routing } from "@/i18n/routing";
import styles from "./IBPromo.module.css";

/**
 * IBPromo — full-width CTA banner above the footer (pattern from
 * nfinitepaper.com): a large rounded image card with a centred heading and a
 * single call-to-action, over a darkening overlay for legibility.
 *
 * Defaults to the IB (Introducing Broker) copy + image, but `image`, `title`,
 * `cta` and `href` can be overridden so the same banner works on other pages
 * (e.g. the Markets page) with a different asset + message.
 */
export function IBPromo({
  image = "/home/ib-promo.png",
  title,
  cta,
  href,
}: {
  image?: string;
  title?: string;
  cta?: string;
  href?: string;
} = {}) {
  const t = useTranslations("ibPromo");
  const locale = useLocale();
  const heading = title ?? t("title");
  const button = cta ?? t("cta");
  const destination =
    href ?? (locale === routing.defaultLocale ? "/partnership" : `/${locale}/partnership`);

  return (
    <section className={styles.promo}>
      <div className={styles.card}>
        {/* ASSET NEEDED: replace with the final banner image for this section. */}
        <Image
          className={styles.bg}
          src={image}
          alt=""
          aria-hidden="true"
          width={1728}
          height={1117}
          sizes="100vw"
        />
        <div className={styles.overlay} />
        <div className={styles.content}>
          <h2 className={styles.title}>{heading}</h2>
          <Button label={button} href={destination} variant="primary" />
        </div>
      </div>
    </section>
  );
}
