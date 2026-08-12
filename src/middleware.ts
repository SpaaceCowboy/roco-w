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

  return handleI18nRouting(request);
}

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (images, fonts, etc.).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
