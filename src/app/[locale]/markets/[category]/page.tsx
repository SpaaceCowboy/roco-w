import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { MarketsView } from "@/components/pages/MarketsPage/MarketsView";
import { CATEGORIES, type Category } from "@/components/pages/MarketsPage/categories";
import { buildMetadata } from "@/lib/seo";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";

const REGISTER = "https://my.rocobroker.com/register";

// Pre-render every category (× every locale via the parent segment).
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<import("next").Metadata> {
  const { locale, category } = await params;
  if (!CATEGORIES.includes(category as Category)) return {};
  const m = await getTranslations({ locale, namespace: "markets" });
  const mp = await getTranslations({ locale, namespace: "marketsPage" });
  return buildMetadata({
    locale,
    path: `/markets/${category}`,
    title: m(`${category}.title`),
    description: mp("sub"),
  });
}

export default async function MarketsCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  if (!CATEGORIES.includes(category as Category)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "marketsPage" });

  return (
    <main id="main-content">
      <MarketsView active={category as Category} />
      <IBPromo image="/markets/banner.png" title={t("bannerTitle")} cta={t("cta")} href={REGISTER} />
      <Footer />
    </main>
  );
}
