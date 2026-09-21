export type GuideSeriesArticle = {
  slug: string;
  title: string;
  description: string;
  embedUrl: string;
  downloadUrl: string;
};

export type GuideSeries = {
  locale: "fa";
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  startLabel: string;
  downloadLabel: string;
  articles: GuideSeriesArticle[];
};

const stepByStepGuide: GuideSeries = {
  locale: "fa",
  slug: "راهنمای-گام-به-گام",
  eyebrow: "مجموعه آموزشی",
  title: "راهنمای گام‌به‌گام روکو",
  description: "مسیرهای تصویری و مرحله‌به‌مرحله برای کار با حساب روکو؛ از ثبت‌نام و احراز هویت تا واریز، برداشت و سوشال ترید.",
  startLabel: "شروع مجموعه",
  downloadLabel: "دانلود نسخه PDF",
  articles: [
    {
      slug: "registration",
      title: "ثبت‌نام در روکو",
      description: "ساخت حساب کاربری، تکمیل اطلاعات اولیه و تأیید ایمیل.",
      embedUrl: "https://www.canva.com/design/DAGgrX6zZlk/54BQxHRZEG8iGk5Ywag-2g/view?embed",
      downloadUrl: "/documents/guides/registration.pdf",
    },
    {
      slug: "identity-verification",
      title: "احراز هویت",
      description: "تکمیل مراحل KYC و ارسال صحیح اطلاعات و مدارک موردنیاز.",
      embedUrl: "https://www.canva.com/design/DAGkJqPA4gs/wa_2uH3oKmWVARf-MFuyzQ/view?embed",
      downloadUrl: "/documents/guides/identity-verification.pdf",
    },
    {
      slug: "ib-request",
      title: "درخواست IB",
      description: "ثبت درخواست همکاری به‌عنوان معرف و آشنایی با مراحل فعال‌سازی.",
      embedUrl: "https://www.canva.com/design/DAGj9e1C3PQ/4qnNI6AMzaUsOhch8Onsqw/view?embed",
      downloadUrl: "/documents/guides/ib-request.pdf",
    },
    {
      slug: "trading-account",
      title: "ساخت حساب معاملاتی",
      description: "ایجاد حساب معاملاتی و انتخاب تنظیمات مناسب در پنل کاربری.",
      embedUrl: "https://www.canva.com/design/DAGouu2qzTQ/g5sWBsPdLwBpvnT7UmuTYg/view?embed",
      downloadUrl: "/documents/guides/trading-account.pdf",
    },
    {
      slug: "cent-account",
      title: "ساخت حساب سِنت",
      description: "ایجاد حساب سِنت برای شروع با حجم و سرمایه کمتر.",
      embedUrl: "https://www.canva.com/design/DAGo6yar2O0/zS7WEJM0UZGS4acrv4tn3w/view?embed",
      downloadUrl: "/documents/guides/cent-account.pdf",
    },
    {
      slug: "rial-deposit",
      title: "واریز ریالی",
      description: "واریز ریالی به حساب روکو از مسیر تاپ‌چنج.",
      embedUrl: "https://www.canva.com/design/DAGjZTRQG7E/6imTCH4s_jMNAew-ZVnacg/view?embed",
      downloadUrl: "/documents/guides/rial-deposit.pdf",
    },
    {
      slug: "rial-withdrawal",
      title: "برداشت ریالی",
      description: "ثبت و پیگیری درخواست برداشت ریالی از طریق تاپ‌چنج.",
      embedUrl: "https://www.canva.com/design/DAGjmZIuSPA/Nt8PN7ZTQSzu29bfO-2G1g/view?embed",
      downloadUrl: "/documents/guides/rial-withdrawal.pdf",
    },
    {
      slug: "crypto-deposit",
      title: "واریز رمزارز",
      description: "انتخاب شبکه، دریافت آدرس و ثبت امن واریز رمزارزی.",
      embedUrl: "https://www.canva.com/design/DAGjq0JKV6Q/tMRr9_XaTD6zUre9lFz1GA/view?embed",
      downloadUrl: "/documents/guides/crypto-deposit.pdf",
    },
    {
      slug: "crypto-withdrawal",
      title: "برداشت رمزارز",
      description: "ثبت آدرس مقصد، انتخاب شبکه و تکمیل درخواست برداشت رمزارز.",
      embedUrl: "https://www.canva.com/design/DAGjr4REycc/wWXL3teYv5hRtpMldbg0LA/view?embed",
      downloadUrl: "/documents/guides/crypto-withdrawal.pdf",
    },
    {
      slug: "internal-transfer",
      title: "انتقال دارایی",
      description: "جابه‌جایی موجودی میان کیف پول و حساب‌های معاملاتی.",
      embedUrl: "https://www.canva.com/design/DAGj9IQ0gcs/AdCZW4vWfiRFinVndzMKJw/view?embed",
      downloadUrl: "/documents/guides/internal-transfer.pdf",
    },
    {
      slug: "bonus",
      title: "فعال‌سازی بونوس",
      description: "مشاهده شرایط و مراحل فعال‌سازی بونوس در حساب واجد شرایط.",
      embedUrl: "https://www.canva.com/design/DAGkN23H0oA/oepVDu8Z9n2HDazdy70Zaw/view?embed",
      downloadUrl: "/documents/guides/bonus.pdf",
    },
    {
      slug: "social-trading",
      title: "سوشال ترید",
      description: "شروع کار با سوشال ترید و مدیریت ارتباط با ارائه‌دهنده استراتژی.",
      embedUrl: "/documents/guides/social-trading.pdf",
      downloadUrl: "/documents/guides/social-trading.pdf",
    },
  ],
};

export const guideSeries = [stepByStepGuide] as const;

export function getGuideSeries(locale: string, slug: string): GuideSeries | undefined {
  return guideSeries.find((series) => series.locale === locale && series.slug === slug);
}

export function getGuideSeriesForLocale(locale: string): GuideSeries[] {
  return guideSeries.filter((series) => series.locale === locale);
}
