import { createNavigation } from "next-intl/navigation";
import type NextLink from "next/link";
import type {
  ComponentProps,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. Use these instead of the ones from
 * `next/link` / `next/navigation` so links automatically keep the active
 * language prefix.
 */
const navigation = createNavigation(routing);
type DynamicBlogPathname = "/blog/[slug]" | "/blog/series/[series]" | "/blog/series/[series]/[article]";
export type StaticPathname = Exclude<keyof typeof routing.pathnames, DynamicBlogPathname>;

// Navigation config is data-driven, so several components receive a validated
// internal href as `string`. Keep that composition ergonomic while the runtime
// navigation helper still localizes every configured pathname.
type BlogHref = {
  pathname: "/blog/[slug]";
  params: { slug: string };
};

type GuideSeriesHref = {
  pathname: "/blog/series/[series]";
  params: { series: string };
};

type GuideArticleHref = {
  pathname: "/blog/series/[series]/[article]";
  params: { series: string; article: string };
};

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: ComponentProps<typeof NextLink>["href"] | BlogHref | GuideSeriesHref | GuideArticleHref;
  locale?: (typeof routing.locales)[number];
};

export const Link = navigation.Link as ForwardRefExoticComponent<
  LinkProps & RefAttributes<HTMLAnchorElement>
>;

export const { redirect, usePathname, useRouter, getPathname } = navigation;

export function blogHref(slug: string): BlogHref {
  return {
    pathname: "/blog/[slug]" as const,
    params: { slug },
  };
}

export function guideSeriesHref(series: string): GuideSeriesHref {
  return { pathname: "/blog/series/[series]", params: { series } };
}

export function guideArticleHref(series: string, article: string): GuideArticleHref {
  return { pathname: "/blog/series/[series]/[article]", params: { series, article } };
}
