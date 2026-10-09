import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SwapFreeLandingView } from "@/components/pages/SwapFreeLandingPage/SwapFreeLandingView";
import { Footer } from "@/components/layout/Footer/Footer";

/** Copy exists in these locales only; others are sent to the English page. */
const LANDING_LOCALES = ["fa", "en"];

/**
 * Campaign landing page. Deliberately unlisted: noindex, no canonical/hreflang
 * (so no `buildMetadata`), and absent from nav, footer and sitemap.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!LANDING_LOCALES.includes(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "swapFreeLanding" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
    // Replace the locale layout's canonical/hreflang (which point at the home
    // page) rather than inherit them.
    alternates: {},
  };
}

export default async function SwapFreeLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  if (!LANDING_LOCALES.includes(locale)) redirect({ href: "/lp/swap-free", locale: "en" });
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <SwapFreeLandingView />
      <Footer />
    </main>
  );
}
