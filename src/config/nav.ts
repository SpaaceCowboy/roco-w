/**
 * Primary navigation config. Each `key` maps to a string under the `nav`
 * namespace in messages/<locale>.json; the numbered order (1.0, 2.0, …) is
 * derived from array position. Items with `children` render a hover dropdown.
 *
 * NOTE: internal hrefs are placeholders — those pages don't exist yet, so they
 * 404 until built. They mirror the live site's IA (children flattened: the
 * live "Tools → Platforms → MetaTrader 5" 3-level nest is collapsed).
 */
export type NavChild = {
  key: string; // i18n key under "nav"
  href: string; // internal path (locale-prefixed) OR external URL
  external?: boolean;
  isBlog?: boolean; // resolve href at render via blogUrl(locale) → WordPress
  soon?: boolean; // page not built yet → render as an inactive "soon" item
};

export type NavItem = {
  key: string;
  href?: string; // used only for leaf items (no children)
  external?: boolean;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: "markets",
    href: "/markets/forex", // clicking the parent opens the Markets page (forex default)
    children: [
      // #markets → land on the page scrolled straight to the selected topic's
      // tab/panel (not the hero top).
      { key: "forexTrading", href: "/markets/forex#markets" },
      { key: "commodities", href: "/markets/commodities#markets" },
      { key: "metals", href: "/markets/metals#markets" },
      { key: "crypto", href: "/markets/crypto#markets" },
      { key: "stocks", href: "/markets/stocks#markets" },
      { key: "indices", href: "/markets/indices#markets" },
    ],
  },
  {
    key: "trading",
    href: "/accounts", // clicking the parent opens the Accounts page
    children: [
      { key: "accountTypes", href: "/accounts#accounts" },
      { key: "socialTrade", href: "/social-trading" },
      { key: "paymentMethods", href: "/payment-methods" },
    ],
  },
  // FAQ is a direct link (the old "Resources" dropdown held Blog + FAQ; there's
  // no blog, so it collapses to a single FAQ entry).
  { key: "faq", href: "/faq" },
  {
    key: "tools",
    children: [
      { key: "metatrader5", href: "/platforms/metatrader-5" },
      { key: "calendar", href: "/calendar" },
    ],
  },
  {
    key: "opportunities",
    children: [
      { key: "promotions", href: "/promotions" },
      { key: "partnership", href: "/partnership" },
    ],
  },
  {
    key: "about",
    children: [
      { key: "aboutUs", href: "/about" },
      { key: "contactUs", href: "/contact" },
      { key: "legalDocuments", href: "/legal-documents" },
    ],
  },
];

/** Call-to-action buttons (external — the separate trading portal). */
export const CTA_LOGIN: NavItem = {
  key: "login",
  href: "https://my.rocobroker.com/login",
  external: true,
};

export const CTA_JOIN: NavItem = {
  key: "joinNow",
  href: "https://my.rocobroker.com/register",
  external: true,
};
