import type { GuideArticleContent } from "../../guide-types";

export const tradingAccountGuide: GuideArticleContent = {
  slug: "trading-account",
  title: "Creating a Trading Account",
  description: "Choosing an account family (Lion or Cheetah) and opening a live trading account in the Client Portal, then connecting it to MetaTrader 5.",
  lead: "A trading account is your live account for trading on MetaTrader 5. In this guide you choose the right account family, open the account in the Client Portal, and receive your MetaTrader login details.",
  readingMinutes: 7,
  updatedAt: "2026-09-21",
  topics: ["Lion", "Cheetah", "MetaTrader 5"],
  intro: [
    "ROCO has two main account families: Lion and Cheetah. Each family has a standard version and a cent (Nano) version, and a dedicated Social Trade version is also offered for social trading. Before opening an account, review the terms of each account and choose the one that matches your trading style.",
  ],
  sections: [
    {
      id: "account-types",
      heading: "ROCO account families",
      lead: "Terms shared by all accounts: leverage up to 1:1000, margin call level 100%, stop out level 40%, minimum volume 0.01 lots, and maximum volume 30 lots.",
      table: {
        caption: "Comparison of ROCO's main accounts",
        headers: ["Account", "Spread", "Commission", "Maximum deposit", "Maximum balance", "Use case"],
        rows: [
          ["Lion", "From 1.2 pips", "0", "Unlimited", "Unlimited", "Standard trading and Social Trade Provider"],
          ["Nano-Lion", "From 1.2 pips", "0", "$200", "$500", "Starting with low capital (cent unit)"],
          ["Cheetah", "Raw spread", "$8", "Unlimited", "Unlimited", "Standard trading and Social Trade Provider"],
          ["Nano-Cheetah", "Raw spread", "8 cents", "$200", "$500", "Starting with low capital (cent unit)"],
        ],
      },
      callouts: [
        {
          variant: "note",
          title: "Social Trade version",
          body: [
            "To follow other traders, you need to open a Social Trade account. The details are covered in the social trading guide.",
          ],
        },
      ],
    },
    {
      id: "mt5",
      heading: "Installing MetaTrader 5 from the ROCO link",
      paragraphs: [
        "Before opening an account, install MetaTrader 5 for your operating system using ROCO's direct link. With this method, MetaTrader is configured by default to the ROCO server once it launches, and you will not need to search manually for the 'Roco Broker Ltd' server.",
      ],
    },
    {
      id: "steps",
      heading: "Steps to open a trading account",
      steps: [
        {
          title: "Sign in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to the Accounts section",
          body: "In the menu that opens, select 'Accounts'. This page shows your trading and demo accounts. To open a new account, click 'Create Live Account'.",
        },
        {
          title: "Select the account type",
          body: "On the create-account page, select 'Live Account' and then go to the 'Platform' section.",
        },
        {
          title: "Select the MT5 - RocoBroker-live platform",
          body: "In the window that opens, select the 'MT5 - RocoBroker-live' platform. The Promotion option is intended for bonus accounts and is explained in the bonus guide.",
        },
        {
          title: "Select the account family",
          body: "In the new window, select your account family: Lion or Cheetah. For a cent account, select the Nano version of the same family and see the cent account guide.",
        },
        {
          title: "Set leverage and accept the agreement",
          body: "Set the account's trading leverage. In the description section you can optionally enter a name to profile the account; completing this section is not mandatory. Finally, tick the 'User Agreement' checkbox and click Save.",
        },
        {
          title: "Receive your account details",
          body: "After the account is created, a page opens showing the full account details. You will also receive an 'Account Opening Confirmation' email from noreply@rocobroker.com. If you do not see the email in your inbox, check your Spam and Junk folders.",
          points: [
            { label: "Trading account number", text: "The number you use to log in to MetaTrader." },
            { label: "Master password", text: "The full account password for logging in to MetaTrader and trading." },
            { label: "Investor password", text: "A read-only password; it only allows you to review trading history and generate reports." },
            { label: "Server", text: "The account server, selected when logging in to MetaTrader." },
          ],
        },
      ],
    },
    {
      id: "password",
      heading: "Changing the account password",
      paragraphs: [
        "On the 'Accounts' page, you can click the key icon for each account and change the master password and the read-only password (the investor password) as you wish. Keep the master and investor passwords in a safe place and do not share them with others.",
      ],
      callouts: [
        {
          variant: "tip",
          title: "Connecting an existing account",
          body: [
            "If you have already created an account on the MT5 platform with the Roco Broker Ltd server, you can use the 'Connect Existing Account' option to enter its account number and password so that it appears in the Client Portal.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The exact names of the options ('Create New Account', 'Live Account', 'Platform') and the English wording Create Live Account may differ in the current version of the panel.",
    "The fees and terms of the accounts are taken from the official ROCO accounts page on this site; until changes are published, the accounts page remains the authoritative source.",
  ],
  references: [
    { label: "ROCO accounts page", href: "https://rocobroker.com/accounts" },
    { label: "MetaTrader 5 page", href: "https://rocobroker.com/metatrader-5" },
    { label: "Client Portal login", href: "https://my.rocobroker.com/login" },
  ],
};
