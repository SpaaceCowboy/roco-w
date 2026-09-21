import type { GuideArticleContent } from "../../guide-types";

export const rialDepositGuide: GuideArticleContent = {
  slug: "rial-deposit",
  title: "Rial Deposit",
  description: "Depositing Iranian rial into your ROCO account through TopChange (TC PAY) with no fee, along with the payment confirmation steps.",
  lead: "To deposit rial directly from Iranian bank accounts, ROCO uses the TopChange (TC PAY) gateway. In this guide you start a rial deposit from the Client Portal and confirm the payment in TopChange.",
  readingMinutes: 6,
  updatedAt: "2026-09-21",
  topics: ["Rial deposit", "TopChange", "TC PAY"],
  intro: [
    "The TopChange platform is a method for users who want to deposit rial directly from Iranian bank accounts. If you do not have an active TopChange account, register on the TopChange website first.",
  ],
  sections: [
    {
      id: "overview",
      heading: "How a rial deposit works",
      bullets: [
        { text: "The deposit is made through the TopChange (TC PAY) gateway and from your rial bank account." },
        { text: "According to ROCO, the deposited amount is exactly the figure you enter and no fee is deducted from it." },
        { text: "The deposit can be credited directly to your wallet or to your trading account." },
      ],
      callouts: [
        {
          variant: "note",
          title: "Before you start",
          body: [
            "If you do not have an active TopChange account, register with TopChange first. For a rial deposit, ROCO identity verification is not required, but it is required for withdrawal.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Steps for a rial deposit",
      steps: [
        {
          title: "Sign in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to Assets",
          body: "In the menu that opens, select 'Assets'.",
        },
        {
          title: "Start a deposit",
          body: "On the Assets page, click the 'Deposit' button.",
        },
        {
          title: "Select the payment method",
          body: "On the new page, click the 'Payment method' menu and select 'TopChange' for a rial deposit.",
        },
        {
          title: "Set the destination and the amount",
          body: "First select the deposit destination (wallet or trading account), then enter the amount you want in the 'Trade amount' section. The amount that must be available in your TopChange account is displayed, and the amount payable is shown with no fee.",
        },
        {
          title: "Confirm and pay",
          body: "Clicking the Deposit button opens a window for reviewing the payment information. After checking it, click the 'Pay Now' button.",
        },
        {
          title: "Sign in to TopChange and confirm the payment",
          body: "You are taken to the TopChange platform. After entering your TopChange username and password, you are directed to the payment confirmation menu.",
          points: [
            { label: "Important", text: "Do not leave the page until this step is complete." },
          ],
        },
        {
          title: "Wait for confirmation and check the result",
          body: "If everything has been done correctly, the status changes from 'Pending' to 'Confirmed' after a few seconds. You can then see the deposited amount in the destination you selected (wallet or trading account).",
        },
      ],
    },
    {
      id: "failed",
      heading: "If the deposit failed",
      paragraphs: [
        "If the status notification for the request shows 'Rejected', the deposit was unsuccessful and no funds have been deducted from your TopChange account.",
      ],
      bullets: [
        { text: "Use the 'Back' option to return to the previous steps." },
        { text: "Check everything from the beginning: the correct destination, amount, and payment method." },
        { text: "If needed, contact ROCO support through live chat or at support@rocobroker.com." },
      ],
    },
  ],
  reviewNotes: [
    "The claim that the deposit is 'fee-free and exactly equal to the amount entered' is quoted from the previous guide and the money transfer methods page and should be confirmed against the gateway's current terms.",
    "The exact button labels ('Deposit', 'Payment method', 'Pay Now') and the menu naming on the TopChange page may have changed.",
  ],
  references: [
    { label: "ROCO money transfer methods", href: "https://rocobroker.com/money-transfer-methods" },
    { label: "Client Portal login", href: "https://my.rocobroker.com/login" },
  ],
};
