import type { GuideArticleContent } from "../../guide-types";

export const registrationGuide: GuideArticleContent = {
  slug: "registration",
  title: "Registering with ROCO",
  pageTitle: "Registration and account creation at ROCO",
  description: "Create your ROCO account, complete your basic identity details, and confirm your email with a one-time code, step by step.",
  lead: "In this guide you will create your ROCO account, enter your basic details, and finalize your registration with an email verification code. Once this step is complete, you can sign in to the client portal and move on to identity verification.",
  readingMinutes: 4,
  updatedAt: "2026-09-21",
  topics: ["Account", "Referral code", "Email verification"],
  intro: [
    "This is the first guide in the series; if you have a referral code or link, keep it ready before you complete this step, because a referral code can only be entered while the account is being created.",
  ],
  sections: [
    {
      id: "before-you-start",
      heading: "What to prepare before you start",
      lead: "Registration takes only a few minutes, but decide a few things in advance so you can complete the form without stopping:",
      bullets: [
        { label: "Referral code", text: "If you came to ROCO through a referral code or link, have it with you. Otherwise, leave the referral code field empty." },
        { label: "Accessible email", text: "Enter an address you can genuinely access; the verification code and account messages are sent to that email." },
        { label: "Phone number", text: "The country code and phone number must be entered in Latin characters." },
        { label: "Real identity details", text: "Enter your first and last name exactly as they appear on your identity document; these details are checked during identity verification." },
      ],
      callouts: [
        {
          variant: "warning",
          title: "Your details must be real and belong to you",
          body: [
            "Using another person's name, email, or phone number can cause problems during identity verification or when withdrawing funds.",
          ],
        },
      ],
    },
    {
      id: "steps",
      heading: "Steps to create your account",
      lead: "The registration form is shared between the website and the client portal and is completed in a few short steps.",
      steps: [
        {
          title: "Go to the website and choose the sign-up option",
          body: "Go to ROCO's official website at rocobroker.com and choose the \"Sign up\" option from the top menu of the page.",
        },
        {
          title: "Complete your personal details",
          body: "The registration form includes first name, last name, nationality, country code, phone, email, password, and referral code. Fields marked with an asterisk are required.",
          points: [
            { label: "Referral code", text: "If you have a referral code, enter it; otherwise leave it empty." },
            { label: "Email", text: "Enter an address you have access to." },
            { label: "Phone", text: "Enter the country code and number in Latin characters." },
          ],
        },
        {
          title: "Confirm the form and drag the slider",
          body: "Once all the fields are filled in, select the sign-up option and drag the security slider all the way so that the form is submitted.",
        },
        {
          title: "Verify your email with a one-time code",
          body: "Enter the code sent to your email in the verification field and press the sign-up (confirm) button.",
        },
        {
          title: "Sign in to the client portal",
          body: "Once registration is complete, you can sign in to the client portal with your email and password at my.rocobroker.com/login.",
        },
      ],
      callouts: [
        {
          variant: "tip",
          title: "If you did not receive the verification code",
          body: [
            "Check your spam and promotions folders (Spam / Junk) and then select the resend code option. If you still do not receive a message, contact support through the website's online chat.",
          ],
        },
      ],
    },
    {
      id: "after-registration",
      heading: "Next step: identity verification",
      paragraphs: [
        "Creating an account activates your access to the client portal; however, to apply to become an IB, withdraw funds, activate a bonus, and make full use of the services, you must complete identity verification (KYC). See the next guide in this series.",
      ],
      callouts: [
        {
          variant: "note",
          body: [
            "At every stage, if you need immediate guidance, the \"Chat\" button in the corner of the page is available. Support also responds by email at support@rocobroker.com.",
          ],
        },
      ],
    },
  ],
  reviewNotes: [
    "The form field and button labels have been matched against the available panel screenshots; however, the form may have changed in the current version of the panel.",
  ],
  references: [
    { label: "ROCO official website - Persian section", href: "https://rocobroker.com" },
    { label: "Client portal login", href: "https://my.rocobroker.com/login" },
  ],
};
