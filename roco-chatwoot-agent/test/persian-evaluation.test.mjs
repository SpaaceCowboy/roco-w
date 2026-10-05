import assert from "node:assert/strict";
import test from "node:test";
import { processMessage } from "./support.mjs";
import { config, job, answer, vendorMock, withFetch } from "./support.mjs";

// Reviewed synthetic expected answers only. This exercises the complete pipeline
// with mocked model output; it does not measure the live model's generation quality.
const cases = [
  { question: "چه پلتفرمی دارید؟", reply: "سلام، من دستیار هوش مصنوعی روکو هستم. روکو پلتفرم MetaTrader 5 را برای دسکتاپ، وب و موبایل ارائه می‌کند.",
    evidence: "ROCO provides MetaTrader 5 on desktop, web and mobile." },
  { question: "با چه رمزارزی می‌توانم واریز کنم؟", reply: "روش رمزارزی پشتیبانی‌شده، USDT در شبکه‌های TRC20، ERC20 و BEP20 است.",
    evidence: "The currently supported crypto payment method is USDT on TRC20, ERC20 and BEP20." },
  { question: "اسپرد و کمیسیون Lion چقدر است؟", reply: "حساب Lion اسپرد از ۱٫۲ پیپ و کمیسیون صفر دارد.",
    evidence: "Lion uses spreads from 1.2 pips and zero commission." },
  { question: "حساب نانو چیست؟", reply: "حساب‌های Nano-Lion و Nano-Cheetah سنتی هستند؛ واریز، موجودی و سود در آن‌ها به سنت نمایش داده می‌شود.",
    evidence: "Nano-Lion and Nano-Cheetah are cent accounts: deposits, balances and profits are displayed in cents." },
  { question: "برای ثبت‌نام چه کنم؟", reply: "برای ثبت‌نام می‌توانید از این لینک استفاده کنید: https://my.rocobroker.com/register",
    evidence: "Client registration: https://my.rocobroker.com/register" },
  { question: "سواپ بعد از هفت روز چه می‌شود؟", reply: "اگر معامله بیش از هفت روز باز بماند، سواپ برای کل دورهٔ نگهداری، از اولین رول‌اور پس از باز شدن، محاسبه می‌شود؛ نه فقط از روز هشتم.",
    evidence: "If it remains open beyond seven days, swap is calculated for the entire holding period from the first rollover after opening, not only from day eight." },
  { question: "آیا USDC هم قبول می‌کنید؟", reply: "USDC در حال حاضر پشتیبانی نمی‌شود و برای پشتیبانی در آینده در نظر گرفته شده است.",
    evidence: "BTC, ETH and USDC are kept for future support and must not be described as available." },
  { question: "حداکثر اهرم معاملاتی چقدر است؟", reply: "اهرم معاملاتی منتشرشده تا 1:1000 است. شرایط ممکن است با نوع حساب، نماد و شرایط جاری متفاوت باشد.",
    evidence: "Common published conditions: leverage up to 1:1000, margin call 100%, stop out 40%, minimum volume 0.01 lots and maximum volume 30 lots.",
    additionalEvidence: "Leverage and availability may vary with account, instrument, promotion, jurisdiction and current conditions." },
  { question: "حساب من محدود شده", handoff: true },
  { question: "برداشتم نرسیده", handoff: true },
  { question: "اهرم مناسب من چقدر است؟", handoff: true },
  { question: "می‌خواهم با پشتیبان صحبت کنم", handoff: true },
];

for (const [index, example] of cases.entries()) {
  test(`reviewed Persian support scenario ${index + 1}`, async () => {
    const decision = answer({ message: example.reply ?? "unused", evidence: [example.evidence, example.additionalEvidence].filter(Boolean) });
    const { state, fetch } = vendorMock({ content: example.question, decisions: [decision] });
    await withFetch(fetch, async () => assert.equal(await processMessage(config, job({ content: example.question })), true));
    assert.equal(state.posts.length, 1);
    if (example.handoff) {
      assert.equal(state.modelCalls.length, 0);
      assert.equal(state.status, "open");
      assert.equal(state.posts[0].content_attributes.decision_action, "handoff");
    } else {
      assert.equal(state.posts[0].content, example.reply);
      assert.equal(state.posts[0].content_attributes.decision_action, "reply");
      assert.equal(state.toggles, 0);
    }
  });
}
