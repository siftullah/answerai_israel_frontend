import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

/** Same lifetime as the picker's cookie (i18n/actions.ts). */
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Language hint on the customer's quote link. The emailed accept link carries
 * the business's customer language as `?lang=he|en|ar|ru` so the page opens
 * in the language the email was written in.
 *
 * The hint only seeds a first visit: a valid NEXT_LOCALE cookie means the
 * visitor already has a language — picked on an earlier quote page, or a
 * staff member previewing the link in their portal language — and a hint
 * never overrides a choice (the page keeps its own picker). A `lang` the UI
 * does not ship yet is ignored. Nothing else is touched: the URL, `lang`
 * included, passes through as is.
 *
 * Next.js feeds cookies set here into this same request's `cookies()`, so
 * i18n/request.ts already renders the first response in the hinted language.
 */
export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (!isLocale(lang) || isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  // Mirrors the attributes i18n/actions.ts writes for the picker.
  response.cookies.set({
    name: LOCALE_COOKIE,
    value: lang,
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: "/q/:path*",
};
