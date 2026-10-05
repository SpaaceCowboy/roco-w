import { normalizeForDetection } from "./language.js";
import type { DecisionReason } from "./types.js";

// Deterministic rules protect high-risk requests; ordinary topic nouns belong
// to the knowledge classifier, not these guards.
const HUMAN = /(?:می خواهم|میخوام|می خوام).{0,30}(?:اپراتور|پشتیبان|کارشناس|انسان)|REQUEST_HUMAN_SUPPORT|\b(?:connect|transfer|speak|talk|chat|want|need).{0,35}\b(?:human|person|agent|representative|operator)\b|^(?:human|live support|agent|operator)[.!?\s]*$|(?:اپراتور|پشتیبان|کارشناس|انسان).{0,30}(?:می خواهم|میخوام|می خوام|وصل|صحبت|چت)|(?:وصل|صحبت|چت|ارتباط).{0,30}(?:اپراتور|پشتیبان|کارشناس|انسان)|^(?:اپراتور|پشتیبان|کارشناس)[.!؟\s]*$|(?:تحدث|ارید|أرید).*(?:موظف|دعم بشری)|(?:转接|联系|想要|我要).{0,20}(?:人工|客服)|(?:人工|客服).{0,20}(?:转接|联系|想要)|^(?:人工|客服|人工客服)$|(?:человек|оператор).*(?:нужен|хочу)|(?:хочу|нужен).*(?:человек|оператор)|(?:sprechen|verbinden).*(?:mitarbeiter|berater)/i;
const SENSITIVE = /\b(?:password|passcode|otp|one[- ]?time code|2fa|seed phrase|private key|secret key|card number|cvv|wallet address)\b|رمز عبور|(?:رمز|کد) یک ?بار ?مصرف|(?:رمز|کد).{0,15}[0-9۰-۹٠-٩]{4,}|کد (?:تایید|تأیید)|عبارت بازیابی|کلید خصوصی|شماره کارت|کد امنیتی|رمز\s*[:=]|مفتاح خاص|验证码|私钥|助记词|пароль|(?:[0-9۰-۹٠-٩][ -]*){13,19}/i;
const COMPLAINT = /\b(?:complaint|complain|scam|fraud|stolen|lawsuit|lawyer|chargeback|dispute)\b|\b(?:is (?:this|roco)|are you).{0,20}\b(?:legal|regulated)\b|\b(?:legal advice|regulatory interpretation)\b|شکایت|کلاهبرداری|تقلب|سرقت|وکیل|اعتراض|(?:آیا|ایا).*(?:قانونی|معتبر)|(?:تفسیر|مشاوره).*(?:حقوقی|قانون)|شکوى|احتیال|سرقة|محام|投诉|欺诈|盗窃|律师|жалоб|мошеннич|украд|юрист/i;
const ADVICE = /\b(?:should i|advise me|best leverage|guaranteed profit|recommend (?:a|an|me)|which (?:account|provider|trade|symbol).{0,25}(?:choose|use|best)|(?:buy|sell|invest).{0,20}(?:now|today)|signal for|allocation for me)\b|(?:بخرم|بفروشم)|(?:اهرم|لوریج|حساب|ارائه دهنده).*(?:پیشنهاد|مناسب من|انتخاب کنم)|(?:پیشنهاد|توصیه).*(?:اهرم|لوریج|حساب|معامله|خرید|فروش)|(?:چی|چه|کدام).*(?:پیشنهاد|سرمایه گذاری کنم)|سود تضمینی|توصیه مالی|هل أشتری|هل أبیع|رافعة مناسبة|(?:推荐|买入|卖出).*(?:我|现在)|гарантированн.*прибыл|(?:купить|продать|инвест).*(?:мне|сейчас)/i;
const ACCOUNT = /\b(?:account balance|account restriction|verify my|my verification|verification status|bonus claim|my (?:account|deposit|withdrawal|payment|transaction|transfer|refund|trade|order|position)|(?:deposit|withdrawal|payment|transaction|transfer|refund)\s+(?:status|pending|failed|rejected|delay|delayed|missing|stuck)|(?:pending|failed|rejected|delayed)\s+(?:deposit|withdrawal|payment|transaction|transfer))\b|(?:حساب|واریز|برداشت|پرداخت|تراکنش|انتقال|بازپرداخت|معامله|سفارش|پوزیشن|بونوس|موجودی)\s*(?:من|م(?:\s|$))|(?:واریز|برداشت|تراکنش|پرداخت).*(?:نرسیده|نشده|ناموفق|رد شده|تاخیر|تأخیر|گیر کرده)|(?:احراز هویت).*(?:من|رد|تایید نشده|تأیید نشده|مشکل)|(?:إیداعی|حسابی)|(?:我的|状态|失败|延迟|待).*(?:余额|账户|充值|提现|付款|交易|退款|订单)|мой\s+(?:депозит|вывод|платеж|транзакц|сделк|ордер)|(?:депозит|вывод).*(?:статус|не приш)/i;
const INJECTION = /\b(?:ignore|disregard|forget|override|bypass|reveal|show|print|repeat).{0,40}\b(?:previous|prior|system|developer|hidden|secret|instruction|prompt|policy)\b|سیستم پرامپت|دستورهای قبلی|تعلیمات السابقة|系统提示词|忽略之前的指令|предыдущие инструкции/i;

export function deterministicHandoffReason(message: string): DecisionReason | null {
  const value = normalizeForDetection(message);
  if (SENSITIVE.test(value)) return "sensitive_information";
  if (HUMAN.test(value)) return "human_requested";
  if (COMPLAINT.test(value)) return "complaint_or_legal";
  if (ADVICE.test(value)) return "financial_advice";
  if (INJECTION.test(value)) return "unsupported_or_uncertain";
  if (ACCOUNT.test(value)) return "needs_account_access";
  return null;
}
