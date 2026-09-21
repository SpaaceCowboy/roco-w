import type { GuideArticleContent } from "../../guide-types";

export const cryptoWithdrawalGuide: GuideArticleContent = {
  slug: "crypto-withdrawal",
  title: "Crypto Withdrawal",
  description: "Submit a cryptocurrency withdrawal request from ROCO: choose the cryptocurrency and network, enter the destination wallet address, and confirm the withdrawal.",
  lead: "In a crypto withdrawal, your account balance is transferred to an external wallet. In this guide you submit a withdrawal request, choose the transfer network, and enter the destination wallet address.",
  readingMinutes: 6,
  updatedAt: "2026-09-21",
  topics: ["Crypto Withdrawal", "Wallet Address", "Transfer Network"],
  intro: [
    "Before making any withdrawal, your identity verification (KYC) must be approved. Accuracy when entering the wallet address is very important; an error in the address can lead to the loss of assets and cannot be recovered.",
  ],
  sections: [
    {
      id: "requirements",
      heading: "Requirements and Safety Notes",
      bullets: [
        { label: "Identity verification", text: "KYC approval is required for any withdrawal." },
        { label: "Wallet address", text: "Enter the destination wallet address carefully and in full. It is recommended that you review the address once more." },
        { label: "Network", text: "The withdrawal network must be the same as the network you used to deposit." },
        { label: "Responsibility", text: "The account holder bears the consequences of any error in entering wallet information." },
      ],
      callouts: [
        {
          variant: "warning",
          title: "Wrong network = loss of assets",
          body: [
            "If you deposited Tether or USDC on a particular network, choose that same network for the withdrawal. For BTC and ETH, only their own networks can be used.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Steps to Submit a Crypto Withdrawal",
      steps: [
        {
          title: "Log in to the Client Portal",
          body: "Sign in to your account at my.rocobroker.com/login and open the hamburger menu in the top corner of the page.",
        },
        {
          title: "Go to Assets and Select Withdrawal",
          body: 'Select the "Assets" option, then on the page that opens click the "Withdrawal" button.',
        },
        {
          title: "Set the Withdrawal Source and Amount",
          body: "Specify the withdrawal source (wallet or trading account) and enter the amount; this amount can only be submitted in US dollars (USD).",
        },
        {
          title: "Select the Withdrawal Method",
          body: "Select the withdrawal method based on your cryptocurrency: USDT, USDC, BTC or ETH. For Tether and USDC, the TRC20, ERC20 and BEP20 networks are supported.",
        },
        {
          title: "Select the Withdrawal Currency (Network)",
          body: "The withdrawal currency is the transfer network itself and must be set based on the cryptocurrency you selected. For Tether and USDC, choose the same network you used to deposit.",
        },
        {
          title: "Enter the Destination Wallet Address",
          body: 'In the "Withdrawal information" section, select a wallet you have previously saved to your profile; or, if you have no saved wallet, enter the full address in the wallet address field.',
        },
        {
          title: "Save the Wallet (Optional) and Submit the Request",
          body: 'To make future withdrawals easier, you can tick the option to save the destination account and choose a name for it. Finally, click the "Send" button. If all steps are correct, the withdrawal confirmation can be seen on the same business day.',
        },
      ],
    },
  ],
  reviewNotes: [
    "The list of active cryptocurrencies and networks is taken from the current payment methods configuration; at present only USDT is active, and the other options may not be selectable in the panel.",
    'The field labels ("withdrawal currency", "net withdrawal amount", "save as withdrawal information") have been matched against the available panel screenshots; whether withdrawals are fee-free must be confirmed against the current version of the panel.',
  ],
  references: [
    { label: "ROCO money transfer methods", href: "https://rocobroker.com/money-transfer-methods" },
    { label: "Log in to the Client Portal", href: "https://my.rocobroker.com/login" },
  ],
};
