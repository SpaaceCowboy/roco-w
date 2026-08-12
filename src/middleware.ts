import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Detects the visitor's language (URL → cookie → Accept-Language header) and
// redirects to the correct locale prefix.
const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Next.js 16 re-invokes middleware on its own internal rewrites. next-intl
  // stamps `x-next-intl-locale` when it rewrites `/` to `/en`, so seeing that
  // header on an *incoming* request means routing already ran for this
  // request. Running it a second time makes `localePrefix: "as-needed"` strip
  // the default-locale prefix and redirect `/en` back to `/`, which loops
  // forever. Let those internal re-entries through untouched.
  if (request.headers.has("x-next-intl-locale")) {
    return NextResponse.next();
  }

  const response = handleI18nRouting(request);

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
