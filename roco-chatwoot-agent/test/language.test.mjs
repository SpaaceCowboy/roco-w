import assert from "node:assert/strict";
import test from "node:test";
import { detectCustomerLanguage, resolveCustomerLanguage, responseMatchesLanguage, handoffText } from "../dist/language.js";
import { deterministicHandoffReason } from "../dist/routing.js";
import { buildConversation } from "../dist/conversation.js";
import { incoming } from "./support.mjs";

test("Persian detection handles shared script and Arabic letter variants", () => {
  for (const message of ["حساب من محدود شده", "سلام", "چطور واريز كنم؟", "MT5 برای موبایل دارید؟", "USDT را قبول می‌کنید؟", "حداقل واریز چقدر است؟"]) {
    assert.equal(detectCustomerLanguage(message), "fa", message);
  }
  for (const message of ["مرحبا، كيف أفتح حساب؟", "حسابي مقيد، أريد المساعدة", "كيف يمكنني الإيداع؟", "أريد السحب من حسابي", "من فضلك ساعدني"]) {
    assert.equal(detectCustomerLanguage(message), "ar", message);
  }
});

test("explicit requests and current evidence precede history; ambiguous turns inherit it", () => {
  assert.equal(resolveCustomerLanguage("Please reply in Persian", ["Hello there"]), "fa");
  assert.equal(resolveCustomerLanguage("لطفاً به انگلیسی پاسخ دهید", ["سلام"]), "en");
  for (const short of ["بله", "42", "USDT", "MT5", "ok", "REQUEST_HUMAN_SUPPORT"]) {
    assert.equal(resolveCustomerLanguage(short, ["چه حساب‌هایی دارید؟"]), "fa", short);
  }
  assert.equal(resolveCustomerLanguage("Which platforms do you offer?", ["سلام، حساب می‌خواهم"]), "en");
  assert.equal(resolveCustomerLanguage("What are the fees?", ["Please reply in Persian"]), "fa");
  assert.equal(resolveCustomerLanguage("سلام", ["مرحبا، أريد مساعدة"]), "ar");
  assert.equal(resolveCustomerLanguage("好的", ["سلام"]), "zh");
});

test("validation checks prose, not Arabic script, brand tokens or links", () => {
  assert.equal(responseMatchesLanguage("fa", "سيتابع أحد مختصي الدعم هذه المحادثة"), false);
  assert.equal(responseMatchesLanguage("fa", "يمكنك السحب من حسابك"), false);
  assert.equal(responseMatchesLanguage("fa", "روکو پلتفرم MT5 را ارائه می‌کند."), true);
  assert.equal(responseMatchesLanguage("fa", "USDT TRC20 https://my.rocobroker.com/login 1:1000"), false);
  assert.equal(responseMatchesLanguage("en", "USDT TRC20 https://my.rocobroker.com/login 1:1000"), false);
  assert.equal(responseMatchesLanguage("ar", "You can register using the approved link."), true);
  assert.equal(responseMatchesLanguage("ar", "You can register. مرحبا"), false);
  assert.equal(responseMatchesLanguage("fa", "روکو provides all accounts."), false);
  for (const language of ["fa", "en", "ar", "zh", "ru", "de"]) {
    assert.equal(responseMatchesLanguage(language, handoffText(language, true)), true, language);
    assert.doesNotMatch(handoffText(language), /shortly|soon|به‌زودی|باز نگه/);
  }
});

test("general FAQs reach knowledge; personal and explicit requests hand off", () => {
  for (const question of ["ساعات کار پشتیبان چیست؟", "کارشناس پشتیبانی چه کاری انجام می‌دهد؟", "برای احراز هویت چه مدارکی لازم است؟", "رگولاتور روکو چیست؟", "مارجین کال چیست؟", "Which account types are available?", "What is stop-out?", "What is trading risk?", "Who is your regulator?", "How do I register?"]) {
    assert.equal(deterministicHandoffReason(question), null, question);
  }
  const cases = [
    ["می‌خواهم با کارشناس صحبت کنم", "human_requested"], ["میخوام با پشتیبان", "human_requested"],
    ["حساب من محدود شده", "needs_account_access"], ["برداشتم نرسیده", "needs_account_access"],
    ["احراز هویت من رد شده", "needs_account_access"], ["اهرم مناسب من چقدر است؟", "financial_advice"],
    ["شکایت دارم", "complaint_or_legal"], ["رمز عبور: synthetic-value", "sensitive_information"],
    ["کد یک‌بارمصرف: ۱۲۳۴۵۶", "sensitive_information"], ["What should I buy?", "financial_advice"],
  ];
  for (const [message, reason] of cases) assert.equal(deterministicHandoffReason(message), reason, message);
});

test("context is chronological, excludes future/private turns and inserts the trigger once", () => {
  const messages = [incoming(44, "future"), incoming(42, "original"), incoming(40, "older"),
    { id: 41, message_type: "outgoing", content: "earlier support", private: false },
    { id: 39, message_type: "outgoing", content: "private", private: true }];
  const result = buildConversation(messages, "42", "trigger");
  assert.deepEqual(result.transcript.map((message) => message.content), ["older", "earlier support", "trigger"]);
  assert.equal(result.isFirstTurn, false);
  assert.deepEqual(buildConversation([], "42", "trigger").transcript, [{ role: "customer", content: "trigger" }]);
  assert.equal(buildConversation([incoming(44, "future")], "42", "trigger").isFirstTurn, true);
});
