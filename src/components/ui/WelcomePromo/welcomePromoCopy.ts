import type { Locale } from "@/i18n/routing";

type WelcomePromoCopy = {
  kicker: string;
  title: string;
  text: string;
  cta: string;
  close: string;
};

export const welcomePromoCopy = {
  en: {
    kicker: "Swap-free trading",
    title: "ROCO Swap-Free Account",
    text: "Eligible positions can remain swap-free for up to 7 consecutive calendar days.",
    cta: "View conditions",
    close: "Close",
  },
  fa: {
    kicker: "معاملات سواپ‌فری",
    title: "حساب سواپ‌فری روکو",
    text: "پوزیشن‌های واجد شرایط را تا ۷ روز تقویمی متوالی بدون سواپ نگهداری کنید.",
    cta: "مشاهده شرایط",
    close: "بستن",
  },
  ar: {
    kicker: "تداول بدون سواب",
    title: "حساب ROCO بدون سواب",
    text: "يمكن إبقاء الصفقات المؤهلة دون سواب لمدة تصل إلى 7 أيام تقويمية متتالية.",
    cta: "عرض الشروط",
    close: "إغلاق",
  },
  de: {
    kicker: "Swap-freier Handel",
    title: "ROCO Swap-Free-Konto",
    text: "Geeignete Positionen können bis zu 7 Kalendertage in Folge swap-frei bleiben.",
    cta: "Bedingungen ansehen",
    close: "Schließen",
  },
  ru: {
    kicker: "Торговля без свопа",
    title: "Счёт ROCO Swap-Free",
    text: "Подходящие позиции могут оставаться без свопа до 7 календарных дней подряд.",
    cta: "Посмотреть условия",
    close: "Закрыть",
  },
  "zh-hans": {
    kicker: "免隔夜利息交易",
    title: "ROCO 免隔夜利息账户",
    text: "符合条件的持仓最多可连续 7 个自然日免收隔夜利息。",
    cta: "查看条件",
    close: "关闭",
  },
} satisfies Record<Locale, WelcomePromoCopy>;
