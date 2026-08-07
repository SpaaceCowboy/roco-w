import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { AccountsView } from "@/components/pages/AccountsPage/AccountsView";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";

const REGISTER = "https://my.rocobroker.com/register";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountsPage" });
  return buildMetadata({ locale, path: "/accounts", title: t("title"), description: t("overview") });
}

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "accountsPage" });

  return (
    <main id="main-content">
      <AccountsView />
      <IBPromo image="/accounts/banner.webp" title={t("bannerTitle")} cta={t("cta")} href={REGISTER} />
      <Footer />
    </main>
  );
}
