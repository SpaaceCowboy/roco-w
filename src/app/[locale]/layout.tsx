import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, routing } from "@/i18n/routing";
import { SITE_URL, OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, localizedUrl, languageAlternates } from "@/lib/seo";
import { montserrat, openSans, vazirmatn } from "@/lib/fonts";
import { Header } from "@/components/layout/Header/Header";
import { SmoothScroll } from "@/components/layout/SmoothScroll/SmoothScroll";
import { CookieConsent } from "@/components/ui/CookieConsent/CookieConsent";
import { WelcomePromo } from "@/components/ui/WelcomePromo/WelcomePromo";
import "../globals.css";

// Dark brand chrome colour for mobile browser UI / installed PWA.
export const viewport: Viewport = {
  themeColor: "#12181b",
};

// Pre-render all locales at build time (static).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s — ${t("title")}` },
    description: t("description"),
    applicationName: "ROCO Broker",
    robots: { index: true, follow: true },
    alternates: { canonical: localizedUrl(locale, "/"), languages: languageAlternates("/") },
    openGraph: {
      type: "website",
      siteName: "ROCO Broker",
      title: t("title"),
      description: t("description"),
      url: localizedUrl(locale, "/"),
      images: [{ url: OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: "ROCO Broker" }],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: [OG_IMAGE] },
  };
}

// This is the app's root layout (every route lives under `[locale]`), so it
// renders <html> and <body>.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "a11y" });

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${montserrat.variable} ${openSans.variable} ${vazirmatn.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <a href="#main-content" className="skip-link">
            {t("skipToContent")}
          </a>
          <SmoothScroll />
          <Header />
          {children}
          <CookieConsent />
          <WelcomePromo />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
