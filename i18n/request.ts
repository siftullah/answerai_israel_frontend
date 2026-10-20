import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";
import { loadMessages } from "./messages";

export default getRequestConfig(async () => {
  // The picker's cookie, else Hebrew (i18n/config.ts). The browser's
  // Accept-Language is deliberately not consulted, so a first visit — the
  // sign-in page included — opens in Hebrew whatever the browser is set to.
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromCookie) ? fromCookie : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    // The business timezone drives every date in the portal (lib/datetime);
    // this only pins next-intl's own formatters so SSR and client agree.
    timeZone: "Asia/Jerusalem",
  };
});
