import type { GuideArticleContent } from "../../guide-types";

export const internalTransferGuide: GuideArticleContent = {
  slug: "internal-transfer",
  title: "Internal Transfer",
  description:
    "Move funds between your ROCO wallet and trading accounts instantly and with no fees.",
  lead: "An internal transfer moves funds between your own wallet and trading accounts. It takes place inside ROCO, carries no fee, and is usually confirmed instantly.",
  readingMinutes: 4,
  updatedAt: "2026-09-21",
  topics: ["Internal Transfer", "Wallet", "Trading Account"],
  intro: [
    "Unlike deposits and withdrawals, an internal transfer never leaves the platform; it simply moves funds between your own accounts at ROCO. To move money in or out from outside, see the deposit and withdrawal guides.",
  ],
  sections: [
    {
      id: "steps",
      heading: "Steps to Transfer Funds",
      steps: [
        {
          title: "Sign in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to Assets and select Transfer",
          body: "In the menu, choose \"Assets\", then on the page that opens click the \"Transfer\" button.",
        },
        {
          title: "Select the source account",
          body: "In the \"Source Account\" field, select the account that holds the balance (the wallet or one of your trading accounts).",
        },
        {
          title: "Select the destination account",
          body: "In the \"Target Account\" field, select the account you want to transfer the balance to.",
        },
        {
          title: "Enter the amount",
          body: "Enter the amount; it is denominated in US dollars (USD), and it makes no difference whether you enter it in the \"Source\" or \"Target\" field, because the figure is the same either way.",
        },
        {
          title: "Submit and confirm",
          body: "Click the \"Send\" button. If the steps are correct, you will see the transfer confirmed on the Assets page instantly and with no fees.",
        },
      ],
    },
    {
      id: "nano",
      heading: "Transfers to cent (Nano) accounts",
      paragraphs: [
        "If the source or destination of a transfer is a Nano account, its currency unit is USC and the platform performs the conversion automatically. If both sides of the transaction are Nano accounts, both sides will be denominated in USC.",
      ],
      callouts: [
        {
          variant: "note",
          title: "Where to find the buttons",
          body: [
            "All three operations - deposit, withdrawal and transfer - are available from the \"Assets\" section of the Client Portal. If you cannot find an option, reload the page or ask online support for help.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The exact button names (\"Transfer\", \"Send\", \"Source Account\", \"Target Account\") are based on the previous guide and must be confirmed against the current version of the panel.",
    "The claim that internal transfers are instant and fee-free comes from the previous guide and has not been independently confirmed by the product team.",
  ],
  references: [
    { label: "Sign in to the Client Portal", href: "https://my.rocobroker.com/login" },
    { label: "ROCO money transfer methods", href: "https://rocobroker.com/money-transfer-methods" },
  ],
};
