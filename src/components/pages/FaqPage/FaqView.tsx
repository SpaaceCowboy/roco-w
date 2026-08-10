"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { PageHero } from "@/components/ui/PageHero/PageHero";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Accordion } from "@/components/ui/Accordion/Accordion";
import { Button } from "@/components/ui/Button/Button";
import { FAQ_ANSWER_VALUES, FAQ_KEYS } from "./keys";
import styles from "./FaqPage.module.css";

const REGISTER = "https://my.rocobroker.com/register";

/**
 * FaqView — the FAQ page. Reuses <PageHero> + <PageBackground> and the shared
 * <Accordion>: a sticky left column (media slot + a "still have questions" CTA)
 * beside the full Q&A accordion. Content from rocobroker.com/faq.
 */
export function FaqView() {
  const t = useTranslations("faqPage");
  const items = FAQ_KEYS.map((k) => {
    const values = FAQ_ANSWER_VALUES[k];
    return {
      id: k,
      q: t(`items.${k}.q`),
      a: values ? t(`items.${k}.a`, values) : t(`items.${k}.a`),
    };
  });

  return (
    <section className={styles.page}>
      <PageBackground />
      <PageHero title={t("title")} overview={t("overview")} />

      <div className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.grid}>
            <aside className={styles.aside}>
              <div className={styles.media}>
                <Image
                  className={styles.mediaImg}
                  src="/faq/question.webp"
                  alt=""
                  width={1200}
                  height={900}
                  sizes="(max-width: 900px) 50vw, 320px"
                />
                <span className={styles.mediaTag}>{t("eyebrow")}</span>
              </div>
              <div className={styles.cta}>
                <p className={styles.ctaText}>{t("overview")}</p>
                <Button label={t("cta")} href={REGISTER} external size="md" />
              </div>
            </aside>

            <div className={styles.main}>
              <Accordion items={items} openFirst />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
