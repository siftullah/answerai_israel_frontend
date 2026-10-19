"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { isLocale } from "@/i18n/config";
import type { User } from "@/lib/api/types";

/**
 * Module state on purpose: once per page load, not per mount. RequireAuth
 * remounts on every business switch, and a re-run there could undo a language
 * the user has just picked while its PATCH /me is still in flight.
 */
let applied = false;

/**
 * Opens the portal in the account's language. The language picker stores a
 * signed-in user's choice on their account (and the sign-up forms the language
 * they registered in), so on a device whose cookie says otherwise — a new
 * phone, a browser that negotiated from Accept-Language — the first
 * authenticated render switches to it. Later switches run the other way
 * (picker → account), so this never fires again to fight them. The API's
 * locale set (en/he/ar/ru) matches the UI's; isLocale() still guards against
 * an account language the UI does not ship.
 */
export function useAccountLocale(user: User | undefined): void {
  const locale = useLocale();
  const router = useRouter();
  const signedIn = user !== undefined;
  const accountLocale = user?.locale;

  useEffect(() => {
    if (!signedIn || applied) return;
    applied = true;
    if (isLocale(accountLocale) && accountLocale !== locale) {
      setLocale(accountLocale).then(() => router.refresh());
    }
  }, [signedIn, accountLocale, locale, router]);
}
