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
export type StaticPathname = Exclude<keyof typeof routing.pathnames, "/blog/[slug]">;

// Navigation config is data-driven, so several components receive a validated
// internal href as `string`. Keep that composition ergonomic while the runtime
// navigation helper still localizes every configured pathname.
type BlogHref = {
  pathname: "/blog/[slug]";
  params: { slug: string };
};

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: ComponentProps<typeof NextLink>["href"] | BlogHref;
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
