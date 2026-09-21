import type { GuideArticleContent } from "../../guide-types";

export const cryptoDepositGuide: GuideArticleContent = {
  slug: "crypto-deposit",
  title: "Crypto Deposit",
  description: "Deposit cryptocurrency to your ROCO account: choose the cryptocurrency and network, get your wallet address, and transfer securely from an external wallet.",
  lead: "Cryptocurrency deposits at ROCO are made without fees. In this guide you choose the cryptocurrency and transfer network, enter the USD amount, and receive your dedicated wallet address.",
  readingMinutes: 6,
  updatedAt: "2026-09-21",
  topics: ["Cryptocurrency", "USDT", "Transfer Network"],
  intro: [
    "Before depositing, determine the cryptocurrency and the transfer network precisely. The wrong network can cause assets to be lost and is usually irreversible.",
  ],
  sections: [
    {
      id: "supported",
      heading: "Supported Cryptocurrencies and Networks",
      lead: "Tether (USDT) deposits are currently enabled at ROCO. Other cryptocurrencies are shown in the payment methods list but may not be enabled for deposits.",
      table: {
        caption: "Cryptocurrency and network status",
        headers: ["Cryptocurrency", "Supported Networks", "Status"],
        rows: [
          ["USDT (Tether)", "TRC20, ERC20, BEP20", "Active"],
          ["USDC", "TRC20, ERC20, BEP20", "Listed, currently inactive"],
          ["Bitcoin (BTC)", "BTC", "Listed, currently inactive"],
          ["Ethereum (ETH)", "ERC20", "Listed, currently inactive"],
        ],
      },
      callouts: [
        {
          variant: "warning",
          title: "Select the network that exactly matches the destination",
          body: [
            "For Tether and USDC, the TRC20, ERC20 and BEP20 networks are supported. Choose a network that your source wallet supports and select the same network on the sending side when you transfer.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Steps to Make a Crypto Deposit",
      steps: [
        {
          title: "Log in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to Assets",
          body: 'Select the "Assets" option from the menu.',
        },
        {
          title: "Start the Deposit and Select a Payment Method",
          body: 'Click the "Deposit" button, then on the new page click the "Payment method" menu. Select the cryptocurrency you want.',
        },
        {
          title: "Set the Destination and Amount",
          body: 'In the "Payment information" section, select the deposit destination (wallet or trading account) and enter the USD amount in the "Payment amount" section. The equivalent figure is displayed in the "Trade amount" section. Then click the deposit button so that your deposit wallet address is generated.',
        },
        {
          title: "Transfer from an External Wallet",
          body: "Copy the generated wallet address and transfer the desired amount from your source wallet or exchange to that same address and using that same network.",
          points: [
            { label: "Confirmation time", text: "Depending on the network and wallet, this usually takes a few minutes." },
            { label: "Verification", text: "After the network confirms the transaction, the amount is displayed in your Client Portal account." },
          ],
        },
      ],
      callouts: [
        {
          variant: "note",
          title: "No fees",
          body: [
            "According to ROCO, users do not pay any fee for transferring cryptocurrency to ROCO. The transfer network may charge its own fee on the sending side.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The list and status of cryptocurrencies is taken from the current payment methods configuration on this site: only USDT is marked as active, while USDC, BTC and ETH are listed but inactive. The previous guide presented all of them as active.",
    "The no-fee claim and the details of the fields on the deposit page must be confirmed again against the current version of the panel.",
  ],
  references: [
    { label: "ROCO money transfer methods", href: "https://rocobroker.com/money-transfer-methods" },
    { label: "Log in to the Client Portal", href: "https://my.rocobroker.com/login" },
  ],
};
