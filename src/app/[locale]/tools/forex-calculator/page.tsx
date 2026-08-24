import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { ForexCalculator } from "@/components/pages/ForexCalculatorPage/ForexCalculator";
import { Footer } from "@/components/layout/Footer/Footer";

const META: Record<string, [string, string]> = {
  fa: ["ماشین حساب فارکس", "مجموعه ابزارهای رایگان محاسبه حجم معامله، سود و زیان، ارزش پیپ، مارجین، سود مرکب، ریسک به ریوارد، دراداون و سواپ."],
  ar: ["حاسبة الفوركس", "أدوات مجانية لحساب حجم الصفقة والأرباح والخسائر وقيمة النقطة والهامش والفائدة المركبة والمخاطر والسحب والتبييت."],
  de: ["Forex-Rechner", "Kostenlose Rechner für Positionsgröße, Gewinn und Verlust, Pip-Wert, Margin, Zinseszins, Chance-Risiko, Drawdown und Swap."],
  ru: ["Форекс-калькулятор", "Бесплатные инструменты для расчета позиции, прибыли и убытка, стоимости пункта, маржи, сложного процента, риска, просадки и свопа."],
  "zh-hans": ["外汇计算器", "免费计算仓位、盈亏、点值、保证金、复利、风险回报、回撤和隔夜利息。"],
  en: ["Forex Calculator", "Free tools for position size, profit and loss, pip value, margin, compound growth, risk/reward, drawdown and swap calculations."],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [title, description] = META[locale] ?? META.en;
  return buildMetadata({ locale, path: "/tools/forex-calculator", title, description });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);
  return <main id="main-content"><ForexCalculator locale={locale} /><Footer /></main>;
}
