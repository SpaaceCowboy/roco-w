import type { GuideArticleContent } from "../../guide-types";

export const socialTradingGuide: GuideArticleContent = {
  slug: "social-trading",
  title: "Social Trade",
  description:
    "Getting started with ROCO Social Trade: registering as a Follower or Provider, configuring trade copying, and managing risk.",
  lead: "ROCO Social Trade lets two groups grow together: Followers who want to use the strategies of professional traders, and Providers who share their own strategy with others.",
  readingMinutes: 12,
  updatedAt: "2026-09-21",
  topics: ["Social Trade", "Follower", "Provider"],
  intro: [
    "In Social Trade, every user can act either as a Follower or as a Provider. This guide first explains the core concepts and then describes, step by step, how to get started and configure both roles.",
  ],
  sections: [
    {
      id: "roles",
      heading: "Who are Followers and Providers?",
      definitions: [
        {
          term: "Follower",
          text: "A user who copies the trades of successful traders they select. Without needing complex analysis, a Follower benefits from the experience of professionals.",
        },
        {
          term: "Provider",
          text: "A professional trader who shares their strategy and trades, and earns income through a profit share or a registration fee.",
        },
      ],
    },
    {
      id: "offer",
      heading: "What does a trader Offer include?",
      lead: "Each Provider can define one or more Offers for Followers. An Offer typically includes the following:",
      bullets: [
        {
          label: "Offer name",
          text: "The title the trader chooses for their strategy.",
        },
        {
          label: "Performance fee",
          text: "A percentage of the Follower's profit charged as a service fee, deducted only when a profit is made.",
        },
        {
          label: "Minimum required balance",
          text: "Optional; some traders set a minimum balance to follow their strategy.",
        },
        {
          label: "Registration fee",
          text: "Optional; a one-time amount paid only at the time of joining.",
        },
      ],
    },
    {
      id: "follower-start",
      heading: "Getting started as a Follower",
      lead: "To copy trades, you must first create a Social Trade account and then register as a Follower in the Social Trade platform.",
      steps: [
        {
          title: "Create a Social Trade trading account",
          body: "Go to the ROCO website and create your user account. From the user panel, go to the \"Social Trading\" section. Under \"Accounts\", open \"Create New Account\" and select the \"MT5 - RocoBroker-live\" platform. Then create one of the two Social Trade account types with your desired leverage.",
        },
        {
          title: "Register as a Follower",
          body: "In the \"Social Trading\" section, open the \"Follower\" menu. A window will appear saying \"To follow provider account, you will need to register as a follower\"; click the \"Register as a Follower\" button.",
          points: [
            {
              label: "Select a trading account",
              text: "Choose the Social Trade account you created.",
            },
            {
              label: "Select a Provider",
              text: "Choose the trader you want from the list.",
            },
            {
              label: "Select an Offer",
              text: "Choose one of that Provider's Offers.",
            },
          ],
        },
        {
          title: "Sign in to the Social Trade platform",
          body: "Once registration is complete, a box appears on the \"Social Trading\" page showing your Social Trade account number as the ID and its balance as the Balance. Click the Login button to enter the Social Trade platform.",
        },
        {
          title: "Getting to know the home page",
          body: "On the main or \"Home\" page you can see overall cost statistics, the number of copied positions, profit, and updates to the Provider's information. The tabs at the top of the page include \"My Portfolio\", \"My Accounts\", \"Transaction History\", \"Ranking\" and \"Reports\".",
        },
      ],
    },
    {
      id: "follower-settings",
      heading: "Follower settings",
      lead: "After entering \"My Portfolio\", click the name of the trader you want to define your four main subscription settings. You can edit these settings even after the subscription is activated.",
      definitions: [
        {
          term: "1. Provider Filters",
          text: "Set the minimum and maximum trade volume; trades that do not meet the filter conditions will not be copied to your account. You can also specify that all trades, only buys, or only sells are copied. After applying the settings, click the save button.",
        },
        {
          term: "2. Subscription Strategy",
          text: "Determines how copied trades differ from the original trades: Auto Scaling, Multiplier, Fixed, or Lot Ratio.",
        },
        {
          term: "3. Correction",
          text: "Set the maximum open volume (Open Max Volume). If the total volume exceeds this limit, you can choose the behavior \"Skip\" or \"Scale Down\".",
        },
        {
          term: "4. Risk Management",
          text: "Personalize your risk management strategy by setting the maximum allowed risk and the Take Profit. To get started, click the \"Create\" button.",
        },
      ],
      callouts: [
        {
          variant: "warning",
          title: "Choose your copy strategy with full awareness",
          body: [
            "The strategy and risk management settings have a direct impact on the risk management and profitability of your account.",
          ],
        },
      ],
    },
    {
      id: "risk-management",
      heading: "Follower risk management",
      lead: "In the Risk Management section, first select the parameter you want and then set the threshold value in dollars.",
      bullets: [
        {
          label: "Total Loss",
          text: "The total amount of loss from copied trades in your account.",
        },
        {
          label: "Total Profit",
          text: "The total amount of profit from copied trades in your account.",
        },
        {
          label: "Floating Loss",
          text: "The total loss of open trades based on the current market price.",
        },
      ],
      paragraphs: [
        "Only trades closed by the trader are counted in the Total Profit and Total Loss calculation, while Floating Loss reflects the current state of open trades. The threshold value determines the point at which your predefined actions are executed.",
        "For example, if you set the loss threshold at $500, when the account's total loss reaches this figure the system automatically executes the action you defined.",
      ],
    },
    {
      id: "provider-start",
      heading: "Getting started as a Provider",
      lead: "A Provider must have a standard trading account; Nano and Social Trade accounts cannot be used for the Provider role.",
      steps: [
        {
          title: "Create a standard trading account",
          body: "After creating your user account, go from the \"Accounts\" section into \"Create New Account\" and select the \"MT5 - RocoBroker-live\" platform. Then create one of the two account types, Lion or Cheetah, with your desired leverage.",
        },
        {
          title: "Register as a Provider",
          body: "In the \"Social Trading\" section, open the \"Provider\" menu. A window will appear saying \"To become a provider, you will need to register as a provider account\"; click the \"Register as a Provider\" button.",
          points: [
            {
              label: "Select a trading account",
              text: "Choose the standard account you created.",
            },
            {
              label: "Nickname",
              text: "Enter the username or nickname that Followers will see.",
            },
          ],
        },
        {
          title: "Sign in to the platform",
          body: "Once registration is complete, a \"Provider Account\" box appears showing the account number as the ID and the balance as the Balance. Click Login to enter the Social Trade platform.",
        },
        {
          title: "Open the Provider settings",
          body: "On the home page, select the first tab in the top navigation bar to enter the \"My asset management accounts\" page.",
        },
      ],
      callouts: [
        {
          variant: "warning",
          title: "Provider account type restriction",
          body: [
            "A Provider's trading account cannot be of the Nano or Social Trade types.",
          ],
        },
      ],
    },
    {
      id: "provider-settings",
      heading: "Provider settings",
      lead: "On the Provider account settings page you can create Offers, complete your profile and manage connected accounts.",
      definitions: [
        {
          term: "Common Information",
          text: "Enter your nickname and set the activity status to Public or Private. In Private mode, your Offer is visible only through the private link.",
        },
        {
          term: "Personal details",
          text: "In the \"Summary\" section, write a brief description of your trading and money management approach; in the \"Considerations\" section, add further details that are shown when someone opens your profile.",
        },
        {
          term: "Strategy",
          text: "Determines whether your stop loss and take profit are displayed, and whether pending orders (Pending Orders) are shown on the profile.",
        },
        {
          term: "Strategy mode",
          text: "Set it to \"All\" so that every open and closed trade is copied; with \"Only Out\", new trades are not copied and only the closing of trades is copied.",
        },
        {
          term: "Finance",
          text: "You decide which account the profit from copied trades is paid into. Using the edit option and selecting \"New Account\", enter the account number and master password and save the changes.",
        },
        {
          term: "Offers",
          text: "Create your Offer by setting the Title, Visibility, Performance, Interval, Registration fee and the minimum balance for Followers. It is possible to define several Offers for one trader.",
        },
        {
          term: "My Accounts and Transaction History",
          text: "Under \"My Accounts\" you see the accounts connected to the Provider account, and under \"Transaction History\" the history of profit and broker-share transactions is displayed.",
        },
      ],
    },
    {
      id: "provider-links",
      heading: "Subscription links for a private Offer",
      paragraphs: [
        "If your Offer is private, you can create a subscription link for it. To create a new link, click \"Add\" and choose the desired Key.",
      ],
      bullets: [
        {
          label: "Expiration",
          text: "By setting a date, the link expires after that time and can no longer be used.",
        },
        {
          label: "Agent",
          text: "Determines which IB partner receives the profit of the people who register through this link.",
        },
      ],
    },
  ],
  reviewNotes: [
    "The names and order of the tabs, the titles of the windows and the options of the Social Trade platform (Register as a Follower / Register as a Provider / Offers, and so on) are quoted from the previous guide and must be confirmed against the current version of the platform; some of these labels are in English and depend on a third-party platform interface.",
    "The exact logic for calculating the profit share and the payment interval was not confirmed in the product sources.",
    "Before public release, the content of this guide must be reviewed by the ROCO product or support team.",
  ],
  references: [
    { label: "ROCO Social Trade page", href: "https://rocobroker.com/social-trading-platform" },
    { label: "Sign in to the Client Portal", href: "https://my.rocobroker.com/login" },
  ],
};
