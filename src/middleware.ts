import createMiddleware from "next-intl/middleware";
import { NextResponse, NextRequest } from "next/server";
import { resolveLegacyRedirect } from "./config/legacyRedirects.mjs";
import { routing } from "./i18n/routing";

// Detects the visitor's language (URL → cookie → Accept-Language header) and
// redirects to the correct locale prefix.
const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // The admin panel is intentionally not locale-prefixed. Authentication and
  // authorization are enforced again inside its server layouts and handlers;
  // bypassing next-intl here only prevents /admin from being rewritten to a
  // public locale route.
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }

  // Next.js 16 re-invokes middleware on its own internal rewrites. next-intl
  // stamps `x-next-intl-locale` when it rewrites `/` to `/en`, so seeing that
  // header on an *incoming* request means routing already ran for this
  // request. Running it a second time makes `localePrefix: "as-needed"` strip
  // the default-locale prefix and redirect `/en` back to `/`, which loops
  // forever. Let those internal re-entries through untouched.
  if (request.headers.has("x-next-intl-locale")) {
    return NextResponse.next();
  }

  // Redirect only direct browser requests. If these rules run after
  // next-intl's internal localized-path rewrite, canonical URLs redirect to
  // themselves (for example `/fa/تبلیغات` -> `/fa/تبلیغات`).
  let originalPathname = request.nextUrl.pathname;
  try {
    originalPathname = decodeURI(originalPathname);
  } catch {
    // Invalid percent encoding cannot match a declared legacy route.
  }

  const legacyDestination = resolveLegacyRedirect(originalPathname);
  if (legacyDestination) {
    const destination = new URL(legacyDestination, request.url);
    destination.search = request.nextUrl.search;
    return NextResponse.redirect(destination, 308);
  }

  // Decode percent-encoded Persian/Arabic/Chinese path segments so
  // next-intl routing matches against decoded slugs (e.g. /fa/[slug]).
  let decodedRequest = request;
  try {
    const decodedUrl = new URL(decodeURI(request.url));
    decodedRequest = new NextRequest(decodedUrl, request);
  } catch {
    // If decoding fails (invalid percent-encoding), fall back to the
    // original request so the middleware can still process it.
  }
  const response = handleI18nRouting(decodedRequest);

  // next-intl rewrites to an absolute URL built from the server's own origin.
  // Behind a TLS-terminating proxy that origin is wrong twice over: the scheme
  // comes from `x-forwarded-proto` (https) while the listener is plain http, and
  // the host is the bind address rather than the public one. Next.js compares
  // that origin against its own, decides the target is external, and tries to
  // *proxy* to it over TLS — which fails the handshake and 500s.
  //
  // The header must stay an absolute URL — Next.js throws `Invalid URL` on a
  // bare path here — so the scheme is corrected back to the one this process is
  // actually listening on, which makes the target self-recognisable again.
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (rewrite && request.headers.get("x-forwarded-proto")) {
    try {
      const target = new URL(rewrite);
      if (target.protocol === "https:") {
        target.protocol = "http:";
        response.headers.set("x-middleware-rewrite", target.toString());
      }
    } catch {
      // Not a URL we can normalise; leave it for Next.js to handle.
    }
  }

  return response;
}

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (images, fonts, etc.).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
