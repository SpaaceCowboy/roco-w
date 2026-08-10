import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { MetaTraderView } from "@/components/pages/MetaTraderPage/MetaTraderView";
import { Footer } from "@/components/layout/Footer/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mt5Page" });
  return buildMetadata({
    locale,
    path: "/platforms/metatrader-5",
    title: t("title"),
    description: t("metaDescription"),
  });
}

export default async function MetaTrader5Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <MetaTraderView />
      <Footer />
    </main>
  );
}
