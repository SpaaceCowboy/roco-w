import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { PartnershipView } from "@/components/pages/PartnershipPage/PartnershipView";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";

const REGISTER = "https://my.rocobroker.com/register";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "partnershipPage" });
  return buildMetadata({
    locale,
    path: "/partnership",
    title: t("title"),
    description: t("sub"),
  });
}

export default async function PartnershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PartnershipView />
      <IBPromo href={REGISTER} />
      <Footer />
    </main>
  );
}
