/** Category slugs — match the nav hrefs and the `markets` i18n keys. Kept in a
 *  plain module (not the "use client" component) so the server route can use it
 *  in generateStaticParams. */
export const CATEGORIES = ["forex", "metals", "commodities", "stocks", "crypto", "indices"] as const;
export type Category = (typeof CATEGORIES)[number];
