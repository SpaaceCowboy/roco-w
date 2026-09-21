import type { GuideArticleContent } from "../../guide-types";

export const ibRequestGuide: GuideArticleContent = {
  slug: "ib-request",
  title: "IB request",
  description: "Submit a cooperation request as an Introducing Broker (IB) in the client portal and gain access to your referral code and dedicated promotional link.",
  lead: "If you would like to cooperate with ROCO as an Introducing Broker (IB), your identity verification must first be approved. In this guide you will submit an IB request and, once approved, gain access to your referral code and dedicated promotional link.",
  readingMinutes: 5,
  updatedAt: "2026-09-21",
  topics: ["IB", "Referral code", "Referral income"],
  intro: [
    "The IB request is available only to active users whose identity verification has been approved. If you have not completed that step, see the identity verification guide first.",
  ],
  sections: [
    {
      id: "prerequisite",
      heading: "Prerequisite for an IB request",
      callouts: [
        {
          variant: "warning",
          title: "Identity verification approval is required",
          body: [
            "Before submitting an IB request, your identity verification (KYC) must be approved. Otherwise, you cannot submit a request.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Steps to submit the request",
      steps: [
        {
          title: "Sign in to the client portal",
          body: "Sign in to your account at my.rocobroker.com/login and press the \"Login\" button.",
        },
        {
          title: "Go to the dashboard",
          body: "Open the hamburger menu in the top corner of the page and select the \"Dashboard\" option.",
        },
        {
          title: "Start the IB request",
          body: "At the bottom of the dashboard page, select the button for the IB request.",
        },
        {
          title: "Complete the statistical information",
          body: "On this page you are asked a few questions about your introducing activity, which are used to assess the request:",
          points: [
            { label: "Number of potential clients", text: "The number of people you introduce as an IB each month who open a trading account and start trading." },
            { label: "Capital in active trading", text: "The amount of capital that is being traded through your referrals." },
            { label: "Market experience", text: "How long you have been active in the market and have trading experience." },
          ],
        },
        {
          title: "Review and submit the request",
          body: "The information you have entered is displayed in one place. If you need to make a change, use the edit option and, at the end, press the \"Submit\" button.",
        },
        {
          title: "Track the status",
          body: "After submission, your request is shown with the status \"Pending approval\". The result of the review is displayed on your client portal page on the same business day.",
        },
      ],
      callouts: [
        {
          variant: "tip",
          title: "If you leave the page midway through the form",
          body: [
            "Press the \"Save\" button so that the information you have entered is kept and you can continue the form later.",
          ],
        },
      ],
    },
    {
      id: "referral",
      heading: "Referral code and my promotional link",
      lead: "Once your IB request is approved, your introducing tools are activated.",
      bullets: [
        { text: "At the bottom of the dashboard page there is a \"My promotional link\" section that gives you full access to the introducing tools." },
        { text: "By selecting your username in the bottom corner of the page, your referral code is shown in the window that opens." },
        { text: "Send this code and link to your clients so that their registration is automatically placed under you as their IB." },
        { text: "The promotional link page lets you use a QR code, copy the link, and share it." },
      ],
      callouts: [
        {
          variant: "note",
          body: [
            "If a user registered before receiving your referral code, a referral code cannot be added to their account after registration. Therefore, give users your referral code from the start.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The exact button labels (\"Become an IB\", \"My promotional link\", \"Dashboard\") are based on the previous guide and need to be confirmed again against the current version of the client portal.",
    "The structure of the IB assessment questions and whether a specific approval criterion exists were not confirmed in the internal product resources.",
  ],
  references: [
    { label: "Client portal login", href: "https://my.rocobroker.com/login" },
    { label: "ROCO official website - cooperation and partnership", href: "https://rocobroker.com/partnership" },
  ],
};
