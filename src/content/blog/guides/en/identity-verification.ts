import type { GuideArticleContent } from "../../guide-types";

export const identityVerificationGuide: GuideArticleContent = {
  slug: "identity-verification",
  title: "Identity verification",
  description: "Complete the identity verification (KYC) steps in the client portal, choose your identity document, and upload the required images correctly.",
  lead: "Identity verification is the key to full access to ROCO's services. In this guide you will enter your identity details, choose the type of identity document, and upload the required images so that your file can be reviewed.",
  readingMinutes: 6,
  updatedAt: "2026-09-21",
  topics: ["KYC", "National ID card", "Passport"],
  intro: [
    "Identity verification approval is required to apply to become an IB, withdraw funds, activate a bonus, and use Social Trade. We recommend completing this step immediately after registration.",
  ],
  sections: [
    {
      id: "requirements",
      heading: "Before you start",
      lead: "To complete the process in a single session, prepare the following:",
      bullets: [
        { text: "A valid identity document: national ID card or passport." },
        { text: "A clear image of the identity document (national ID card or the first page of your passport)." },
        { text: "A selfie in which you are holding your identity document, with both your face and the text on the document legible." },
        { text: "If you are using a national ID card, an image of the back of the national ID card." },
      ],
      callouts: [
        {
          variant: "warning",
          title: "Do not change the document you selected during the process",
          body: [
            "If you begin identity verification with a national ID number, you must provide a national ID card until the process is complete; if you start with a passport number, use the passport until the end.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Identity verification steps",
      steps: [
        {
          title: "Sign in to the client portal",
          body: "Sign in to the client portal at my.rocobroker.com/login with the email and password you registered with and press the \"Login\" button.",
        },
        {
          title: "Open the user menu",
          body: "On the client portal page, open the hamburger menu in the top corner of the page and select the profile option.",
        },
        {
          title: "Select the user information and identity verification section",
          body: "In the menu that opens, select the option for user information and identity verification so that the basic information page opens.",
        },
        {
          title: "Complete the basic information",
          body: "Enter your identity details carefully and fill in every field marked with an asterisk. Then press the \"Next\" button.",
          points: [
            { label: "Date of birth", text: "This field must be entered in the Gregorian calendar. To convert a Solar Hijri date to Gregorian, you can use reliable date conversion tools." },
            { label: "Saving a draft", text: "If you leave the page midway, press the \"Save\" button so that the information you have entered is not lost." },
          ],
        },
        {
          title: "Choose the document type and upload the images",
          body: "In the first field, specify the type of identity document (national ID card or passport) and then upload the images in order.",
          points: [
            { text: "An image of the national ID card or the first page of the passport." },
            { text: "A selfie in which you are holding your identity document, in such a way that the text on the document and your face are completely clear." },
            { text: "An image of the back of the national ID card; if you are verifying with a passport, this field remains empty." },
          ],
        },
        {
          title: "Review and submit",
          body: "On the final page, your basic information and the uploaded images are displayed. If you need to make a change, use the edit option; otherwise press the \"Submit\" button.",
        },
      ],
    },
    {
      id: "review",
      heading: "Review and approval of your file",
      paragraphs: [
        "After submission, your file status is shown as \"Pending approval\". According to the official guide, the result of the review is determined within up to two business hours.",
      ],
      bullets: [
        { text: "If approved, a confirmation email and an identity verification approval message are sent to you." },
        { text: "If not approved, a rejection message is sent together with the reason, and you can apply again after correcting the issue." },
      ],
      callouts: [
        {
          variant: "tip",
          title: "How to get approved faster",
          body: [
            "Take the images in sufficient light, without glare, and in full clarity. Make sure all corners of the document are within the frame and that no part of the text or photo is illegible.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The section labels have been matched against the available panel screenshots (\"User information and identity verification\", \"Basic information\", \"Identity document\"); however, the field naming may have changed in the current version of the panel.",
    "The \"up to two business hours\" approval time is a claim from the previous guide and has not been independently confirmed by the product team.",
  ],
  references: [
    { label: "Client portal login", href: "https://my.rocobroker.com/login" },
    { label: "ROCO official website - Persian section", href: "https://rocobroker.com" },
  ],
};
