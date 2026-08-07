import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
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
  image = "/home/ib-promo.webp",
  title,
  cta,
  href = "#",
}: {
  image?: string;
  title?: string;
  cta?: string;
  href?: string;
} = {}) {
  const t = useTranslations("ibPromo");
  const heading = title ?? t("title");
  const button = cta ?? t("cta");

  return (
    <section className={styles.promo}>
      <div className={styles.card}>
        {/* ASSET NEEDED: replace with the final banner image for this section. */}
        <img
          className={styles.bg}
          src={image}
          alt=""
          aria-hidden="true"
          width={1728}
          height={1117}
          loading="lazy"
          decoding="async"
        />
        <div className={styles.overlay} />
        <div className={styles.content}>
          <h2 className={styles.title}>{heading}</h2>
          <Button label={button} href={href} variant="primary" />
        </div>
      </div>
    </section>
  );
}
