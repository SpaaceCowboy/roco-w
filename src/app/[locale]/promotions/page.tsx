import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { PromotionsView } from "@/components/pages/PromotionsPage/PromotionsView";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";

const REGISTER = "https://my.rocobroker.com/register";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "promotionsPage" });
  return buildMetadata({
    locale,
    path: "/promotions",
    title: t("title"),
    description: `${t("lead")} ${t("leadAccent")}`,
  });
}

export default async function PromotionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "promotionsPage" });

  return (
    <main id="main-content">
      <PromotionsView />
      <IBPromo
        image="/payment-methods/banner.png"
        title={t("bannerTitle")}
        cta={t("bannerCta")}
        href={REGISTER}
      />
      <Footer />
    </main>
  );
}
