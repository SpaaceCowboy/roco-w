import type { GuideArticleContent } from "../../guide-types";

export const centAccountGuide: GuideArticleContent = {
  slug: "cent-account",
  title: "Creating a Cent Account",
  description: "Opening a ROCO cent (Nano) account with the USC currency unit, how cents are calculated, and deposit and withdrawal notes for this account.",
  lead: "Nano or cent accounts are designed for starting with less capital. In this account you work with the USC unit instead of dollars; in this guide you open a Nano account and learn how its deposit and withdrawal differ.",
  readingMinutes: 6,
  updatedAt: "2026-09-21",
  topics: ["Nano", "USC", "Cent account"],
  intro: [
    "A cent account suits traders who want to start with smaller volume and capital. Nano-Lion and Nano-Cheetah are ROCO's two cent accounts, and their base terms are identical to the standard version, except that their currency unit is the cent.",
  ],
  sections: [
    {
      id: "what-is-usc",
      heading: "What is USC?",
      definitions: [
        { term: "USC - United States Cent", text: "The currency unit of a cent account. Each USC equals one US cent and is equal to 0.01 USD." },
        { term: "Automatic conversion", text: "On transfers and withdrawals, the unit conversion is carried out automatically by the platform, unless the counterparty to the transaction also holds a cent account, in which case both sides are in USC." },
      ],
      callouts: [
        {
          variant: "note",
          title: "The Nano account balance is always in USC",
          body: [
            "The funds held in a Nano account are always displayed in USC. Therefore, when funds enter or leave the account, all calculations are based on cents.",
          ],
        },
      ],
    },
    {
      id: "account-types",
      heading: "ROCO's two cent accounts",
      table: {
        caption: "Comparison of cent accounts",
        headers: ["Account", "Spread", "Commission", "Maximum deposit", "Maximum balance"],
        rows: [
          ["Nano-Lion", "From 1.2 pips", "0", "$200", "$500"],
          ["Nano-Cheetah", "Raw spread", "8 cents", "$200", "$500"],
        ],
      },
    },
    {
      id: "steps",
      heading: "Steps to open a cent account",
      lead: "The steps to open a cent account are the same as for a standard account; only at the account-selection step do you choose the Nano version.",
      steps: [
        {
          title: "Sign in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to the Accounts section",
          body: "Select 'Accounts'. To open a cent account, click the 'Create Live Account' button.",
        },
        {
          title: "Select a live account and platform",
          body: "Select 'Live Account' and under 'Platform' choose 'MT5 - RocoBroker-live'.",
        },
        {
          title: "Select the Nano version",
          body: "In the account selection window, choose one of the two accounts, Nano-Lion or Nano-Cheetah.",
        },
        {
          title: "Set leverage and accept the agreement",
          body: "Set the trading leverage, optionally enter a name for the account, tick the 'User Agreement' checkbox, and click Save.",
        },
        {
          title: "Receive your account details",
          body: "After the account is created, the account number, master password, investor password, and server are displayed to you, and an 'Account Opening Confirmation' email is sent.",
        },
      ],
    },
    {
      id: "deposit-withdraw",
      heading: "Deposits and withdrawals in a cent account",
      paragraphs: [
        "To deposit into a Nano account, first read the deposit guide, then on the deposit page, under the payment information section, select the Nano account you want (the one labelled USC next to its account number). Then enter the amount in dollars; the cent equivalent is displayed on that same basis in the trade amount section.",
        "For example, if for a direct USDT deposit into a Nano account each USC is taken to equal one hundredth of a USDT, then depositing 100 USDT credits your account with 10,000 cents (USC).",
      ],
      callouts: [
        {
          variant: "warning",
          title: "Minimum transaction amount",
          body: [
            "According to the previous guide, the minimum transaction amount on the ROCO platform is 1,000 USC, equivalent to $10. This figure should be re-checked against the platform's current rules.",
          ],
        },
        {
          variant: "tip",
          title: "Keep the counterparty in USC to avoid mistakes",
          body: [
            "For all operations related to a Nano account, it is recommended that the counterparty in your transactions also be your USC wallet, so that no unintended conversions occur.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The currency unit and terms of the Nano accounts are taken from the official accounts page; however, the 'minimum 1,000 USC equivalent to $10' and the USDT conversion example are quoted from the previous guide and should be confirmed against the platform's current rules.",
    "The exact labels of the buttons and options in the account creation form may have changed in the current version of the panel.",
  ],
  references: [
    { label: "ROCO accounts page", href: "https://rocobroker.com/accounts" },
    { label: "Client Portal login", href: "https://my.rocobroker.com/login" },
  ],
};
