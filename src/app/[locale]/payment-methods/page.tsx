import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { PaymentsView } from "@/components/pages/PaymentsPage/PaymentsView";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";

const REGISTER = "https://my.rocobroker.com/register";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "paymentsPage" });
  return buildMetadata({
    locale,
    path: "/payment-methods",
    title: t("title"),
    description: t("sub"),
  });
}

export default async function PaymentMethodsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  const s = await getTranslations({ locale, namespace: "socialTrading" });

  return (
    <main id="main-content">
      <PaymentsView />
      <IBPromo
        image="/payment-methods/banner.webp"
        title={s("banner.title")}
        cta={s("banner.cta")}
        href={REGISTER}
      />
      <Footer />
    </main>
  );
}
