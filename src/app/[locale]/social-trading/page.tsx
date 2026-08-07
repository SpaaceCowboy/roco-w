import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { SocialTradingView } from "@/components/pages/SocialTradingPage/SocialTradingView";
import { SocialValues } from "@/components/pages/SocialTradingPage/SocialValues";
import { SocialRating } from "@/components/pages/SocialTradingPage/SocialRating";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";

const REGISTER = "https://my.rocobroker.com/register";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialTrading" });
  return buildMetadata({
    locale,
    path: "/social-trading",
    title: `${t("title")} ${t("titleAccent")}`,
    description: t("lead"),
  });
}

export default async function SocialTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "socialTrading" });

  return (
    <main id="main-content">
      <SocialTradingView />
      <SocialValues />
      <SocialRating />
      <IBPromo
        image="/social-trading/banner.webp"
        title={t("banner.title")}
        cta={t("banner.cta")}
        href={REGISTER}
      />
      <Footer />
    </main>
  );
}
