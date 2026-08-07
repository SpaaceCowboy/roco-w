import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Detects the visitor's language (URL → cookie → Accept-Language header) and
// redirects to the correct locale prefix.
export default createMiddleware(routing);

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (images, fonts, etc.).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
