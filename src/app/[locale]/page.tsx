import { getTranslations, setRequestLocale } from "next-intl/server";
import { Home } from "@/components/sections/Home/Home";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";

// Home page — the layout supplies its metadata (canonical/hreflang/OG for "/").
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });

  // Organization / FinancialService structured data — describes the brand and
  // the services offered (rich results + entity understanding).
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "ROCO Broker",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/RokoLogo.svg`,
    image: `${SITE_URL}${OG_IMAGE}`,
    description: t("description"),
    email: "support@rocobroker.com",
    sameAs: [
      "https://www.instagram.com/rocobroker/",
      "https://www.linkedin.com/company/rocobroker/",
    ],
    areaServed: "Worldwide",
    knowsAbout: [
      "Forex trading",
      "Commodities",
      "Metals",
      "Stocks",
      "Cryptocurrencies",
      "Indices",
      "CFD trading",
      "MetaTrader 5",
    ],
  };

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <Home />
    </main>
  );
}
