import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { SwapFreeView } from "@/components/pages/SwapFreePage/SwapFreeView";
import { Footer } from "@/components/layout/Footer/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "swapFreePage" });

  return buildMetadata({
    locale,
    path: "/swap-free-account",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function SwapFreeAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <SwapFreeView />
      <Footer />
    </main>
  );
}
