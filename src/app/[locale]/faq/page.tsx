import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { FaqView } from "@/components/pages/FaqPage/FaqView";
import { FAQ_ANSWER_VALUES, FAQ_KEYS } from "@/components/pages/FaqPage/keys";
import { Footer } from "@/components/layout/Footer/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faqPage" });
  return buildMetadata({ locale, path: "/faq", title: t("title"), description: t("overview") });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  // FAQPage structured data for rich results.
  const t = await getTranslations({ locale, namespace: "faqPage" });
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((k) => {
      const values = FAQ_ANSWER_VALUES[k];
      return {
        "@type": "Question",
        name: t(`items.${k}.q`),
        acceptedAnswer: {
          "@type": "Answer",
          text: values ? t(`items.${k}.a`, values) : t(`items.${k}.a`),
        },
      };
    }),
  };

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <FaqView />
      <Footer />
    </main>
  );
}
