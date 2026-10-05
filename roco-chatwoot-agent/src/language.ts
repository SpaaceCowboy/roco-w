export type CustomerLanguage = "fa" | "ar" | "zh" | "ru" | "de" | "en";

/** Detection only: never rewrite customer content, URLs or identifiers. */
export function normalizeForDetection(value: string): string {
  return value.normalize("NFKC").replace(/ك/g, "ک").replace(/[يى]/g, "ی")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/\u200c/g, " ")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

const FA_WORDS = /(?:^|[^\p{L}])(?:حساب من|واریز من|برداشت من|شما|در|مورد|هنوز|متوجه|شده|است|هست|هستم|هستند|دارم|دارید|دارد|را|رو|برای|چطور|چگونه|چقدر|چی|میشه|می شود|می توان|می توانید|می کنم|می خوام|میخواهم|می خواهم|لطفا|بله|خیر|نه|ممنون|متشکرم|متشکریم|کمک|روکو|واریز|برداشت|احراز هویت|چه|کدام|چند|ندارم|نشده|نشد|نمی|بفرمایید|درود|ببخشید)(?:$|[^\p{L}])/u;
const AR_WORDS = /(?:^|[^\p{L}])(?:مرحبا|أهلا|اهلا|أرید|ارید|کیف|ماذا|هل|حسابک|حسابکم|یمکنک|یمکنکم|لدیکم|نعم|أرجو|للمساعدة|للدعم|شکرا|شکراً|الرجاء|یوجد|یمکن|هذا|هذه|سیتابع|المحادثة|الدعم|إیداع|السحب|یتم|الیوم|لطفاً)(?:$|[^\p{L}])/u;
const SHARED_GREETING = /^(?:سلام(?: علیکم)?|هی|های)[!؟?.،\s]*$/u;

export function substantiveProse(value: string): string {
  return value.replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]+/gi, " ")
    .replace(/`[^`]*`/g, " ").replace(/روکو/g, " ")
    .replace(/\b(?:REQUEST_HUMAN_SUPPORT|ROCO|MT5|MetaTrader(?:\s*5)?|USDT|USDC|BTC|ETH|TRC20|ERC20|BEP20|CFDs?|KYC|USD|EUR|Lion|Cheetah|Nano|Visa|Mastercard|Swap[- ]Free|Social Trade)\b/gi, " ")
    .replace(/[0-9۰-۹٠-٩]+(?:[.:/%-][0-9۰-۹٠-٩]+)*/g, " ").trim();
}

function explicitPreference(message: string): CustomerLanguage | null {
  const value = normalizeForDetection(message);
  // Require a request, not a mention such as "Do you have Persian support?".
  const patterns: Array<[CustomerLanguage, RegExp]> = [
    ["fa", /(?:به )?فارسی\s+(?:جواب|پاسخ|صحبت|بنویس)|(?:جواب|پاسخ|صحبت).*به فارسی|(?:reply|respond|answer|write|speak)\s+(?:to me\s+)?(?:in\s+)?(?:persian|farsi)/],
    ["en", /(?:به )?انگلیسی\s+(?:جواب|پاسخ|صحبت|بنویس)|(?:جواب|پاسخ|صحبت).*به انگلیسی|(?:reply|respond|answer|write|speak)\s+(?:to me\s+)?(?:in\s+)?english/],
    ["ar", /(?:reply|respond|answer|write|speak)\s+(?:in\s+)?arabic|(?:أجب|اجب|تحدث).*العربیة/],
    ["zh", /(?:reply|respond|answer|write|speak)\s+(?:in\s+)?(?:chinese|mandarin)|(?:请|請).*(?:中文|汉语|漢語)/],
    ["ru", /(?:reply|respond|answer|write|speak)\s+(?:in\s+)?russian|(?:ответь|отвечайте|говори).*русск/],
    ["de", /(?:reply|respond|answer|write|speak)\s+(?:in\s+)?german|(?:antworte|antworten).*deutsch/],
  ];
  return patterns.find(([, pattern]) => pattern.test(value))?.[0] ?? null;
}

function evidence(message: string): CustomerLanguage | null {
  const prose = substantiveProse(message);
  const value = normalizeForDetection(prose);
  if (!value || SHARED_GREETING.test(value) || /^(?:ok|okay|thanks|thank you|yes|no|باشه|ممنون|بله|نه|خیر)[.!؟?\s]*$/u.test(value)) return null;
  if (FA_WORDS.test(value) || /[پچژگ]/u.test(value)) return "fa";
  if (AR_WORDS.test(value)) return "ar";
  if (/[کی]/u.test(prose)) return "fa";
  if (/[\u0600-\u06ff]/u.test(value)) return "ar";
  if (/[一-鿿]/u.test(value)) return "zh";
  if (/[А-Яа-яЁё]/u.test(value)) return "ru";
  if (/[äöüß]/u.test(value) || /\b(?:hallo|bitte|konto|mitarbeiter|berater|danke|deutsch)\b/u.test(value)) return "de";
  if (/[a-z]{2,}/u.test(value)) return "en";
  return null;
}

export function resolveCustomerLanguage(message: string, customerHistory: string[] = []): CustomerLanguage {
  const explicit = explicitPreference(message);
  if (explicit) return explicit;
  for (const earlier of [...customerHistory].reverse()) {
    const preference = explicitPreference(earlier);
    if (preference) return preference;
  }
  const current = evidence(message);
  if (current) return current;
  for (const earlier of [...customerHistory].reverse()) {
    const previous = explicitPreference(earlier) ?? evidence(earlier);
    if (previous) return previous;
  }
  return SHARED_GREETING.test(normalizeForDetection(message)) || FA_WORDS.test(normalizeForDetection(message)) ? "fa" : "en";
}

export function detectCustomerLanguage(message: string): CustomerLanguage {
  return resolveCustomerLanguage(message);
}

export function responseMatchesLanguage(language: CustomerLanguage, response: string): boolean {
  const prose = substantiveProse(response);
  const value = normalizeForDetection(prose);
  if (language === "fa") {
    if (AR_WORDS.test(value)) return false;
    const arabicLetters = prose.match(/[\u0620-\u064a\u0671-\u06d3]/gu)?.length ?? 0;
    const otherLetters = prose.match(/[A-Za-z一-鿿А-Яа-яЁё]/gu)?.length ?? 0;
    if (arabicLetters < otherLetters) return false;
    return FA_WORDS.test(value) || /[پچژگکی]/u.test(prose) || /^سلام[!؟?.\s]*$/u.test(value);
  }
  if (language === "zh") return /[一-鿿]/u.test(prose);
  if (language === "ru") return /[А-Яа-яЁё]/u.test(prose);
  if (language === "de") return /[A-Za-zÄÖÜäöüß]{2,}/u.test(prose) && !/[\u0600-\u06ff一-鿿А-Яа-яЁё]/u.test(prose);
  // Arabic customers intentionally receive English.
  return /[A-Za-z]{2,}/u.test(prose) && !/[\u0600-\u06ff一-鿿А-Яа-яЁё]/u.test(prose);
}

export function responseMatchesCustomerLanguage(message: string, response: string): boolean {
  return responseMatchesLanguage(detectCustomerLanguage(message), response);
}

export function replyLanguageHint(language: CustomerLanguage): string {
  const hints: Record<CustomerLanguage, string> = {
    fa: "Persian (Farsi), using Persian script and the brand روکو",
    ar: "English only — never Arabic script", zh: "Simplified Chinese", ru: "Russian", de: "German", en: "English",
  };
  return hints[language];
}

/** Only used after Chatwoot confirms status=open. */
export function handoffText(language: CustomerLanguage, sensitive = false): string {
  const texts: Record<CustomerLanguage, string> = {
    fa: "گفتگو به تیم پشتیبانی منتقل شد. کارشناس پشتیبانی ادامهٔ گفتگو را پیگیری می‌کند.",
    ar: "Your conversation has been transferred to our support team. A support specialist will continue the conversation.",
    en: "Your conversation has been transferred to our support team. A support specialist will continue the conversation.",
    zh: "您的会话已转交支持团队，支持专员将继续处理。",
    ru: "Ваш разговор передан команде поддержки. Специалист поддержки продолжит общение.",
    de: "Ihr Gespräch wurde an unser Support-Team übergeben. Ein Support-Mitarbeiter wird das Gespräch fortsetzen.",
  };
  if (!sensitive) return texts[language];
  const warnings: Record<CustomerLanguage, string> = {
    fa: "لطفاً رمز عبور، کد یک‌بارمصرف، اطلاعات کارت، عبارت بازیابی یا کلید خصوصی را ارسال نکنید.",
    ar: "Never send passwords, one-time codes, card details, seed phrases or private keys.",
    en: "Never send passwords, one-time codes, card details, seed phrases or private keys.",
    zh: "请勿发送密码、验证码、银行卡信息、助记词或私钥。",
    ru: "Не отправляйте пароли, одноразовые коды, данные карты, сид-фразы или закрытые ключи.",
    de: "Senden Sie keine Passwörter, Einmalcodes, Kartendaten, Seed-Phrasen oder privaten Schlüssel.",
  };
  return `${texts[language]} ${warnings[language]}`;
}

/** Prefix for confirmed outside-hours transfers; no staffing or response-time promise. */
export function offlineText(language: CustomerLanguage): string {
  const texts: Record<CustomerLanguage, string> = {
    fa: "دستیار هوش مصنوعی در حال حاضر فعال نیست.",
    ar: "The AI assistant is currently offline.",
    en: "The AI assistant is currently offline.",
    zh: "AI 助手目前不在线。",
    ru: "ИИ-ассистент сейчас не работает.",
    de: "Der KI-Assistent ist derzeit offline.",
  };
  return texts[language];
}
