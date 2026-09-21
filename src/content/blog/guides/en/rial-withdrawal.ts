import type { GuideArticleContent } from "../../guide-types";

export const rialWithdrawalGuide: GuideArticleContent = {
  slug: "rial-withdrawal",
  title: "Rial Withdrawal",
  description: "Submit a rial withdrawal from your ROCO account to an Iranian bank account through TopChange (TC PAY).",
  lead: "A rial withdrawal transfers the balance of your ROCO account to an Iranian bank account through TopChange. This guide shows you how to submit a withdrawal request and complete the required fields.",
  readingMinutes: 5,
  updatedAt: "2026-09-21",
  topics: ["Rial Withdrawal", "TopChange", "KYC"],
  intro: [
    "Before making any withdrawal, your identity verification (KYC) must be approved. If you have not completed identity verification yet, see the identity verification guide first. For a rial withdrawal, your bank account must be registered with TopChange.",
  ],
  sections: [
    {
      id: "requirements",
      heading: "Requirements",
      bullets: [
        { text: "Identity verification (KYC) approval - required for any withdrawal." },
        { text: "An active TopChange (TC PAY) account with a bank account registered in your own name." },
        { text: "The correct selection of the withdrawal source (wallet or trading account) and the amount." },
      ],
      callouts: [
        {
          variant: "warning",
          title: "Withdraw only to an account in your own name",
          body: [
            "To prevent your request from being blocked, the destination account must belong to the ROCO account holder.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Steps to Submit a Rial Withdrawal",
      steps: [
        {
          title: "Log in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to Assets and Select Withdrawal",
          body: 'In the menu, select "Assets", then on the page that opens click the "Withdrawal" button.',
        },
        {
          title: "Set the Withdrawal Source and Amount",
          body: "Specify the withdrawal source (wallet or trading account) and enter the amount in the field below it. The maximum amount per withdrawal and transfer to TopChange is $3,000.",
        },
        {
          title: "Select the Withdrawal Method",
          body: 'Set the withdrawal method to "TopChange" (TC PAY).',
        },
        {
          title: "Select the Withdrawal Currency",
          body: 'Select US dollars (USD) as the withdrawal currency. The "Net withdrawal amount" is displayed below it, which according to ROCO is exactly equal to the amount entered and has no fee deducted from it.',
        },
        {
          title: "Save the Destination Account (Optional)",
          body: "If you want the destination account to be saved to your profile for future withdrawals, tick this section and choose a name for it in the window that opens.",
        },
        {
          title: "Submit the Request",
          body: 'Click the "Send" button. If all steps have been completed correctly, the withdrawal confirmation will be visible in your account by the same business day at the latest.',
        },
      ],
    },
    {
      id: "timing",
      heading: "Timing and Outcome",
      paragraphs: [
        "Rial withdrawal requests are usually reviewed on the same business day. You can track the status of your request in the Assets section. If a request is rejected, the reason is displayed in the panel and you can try again once the issue has been resolved.",
      ],
    },
  ],
  reviewNotes: [
    "The \"$3,000 per withdrawal\" cap and the \"no fee\" claim are quoted from the previous guide and must be confirmed against the payment gateway's current terms.",
    'The exact button labels and field names ("withdrawal source", "withdrawal method", "withdrawal currency") may have changed in the current version of the panel.',
  ],
  references: [
    { label: "ROCO money transfer methods", href: "https://rocobroker.com/money-transfer-methods" },
    { label: "Log in to the Client Portal", href: "https://my.rocobroker.com/login" },
  ],
};
