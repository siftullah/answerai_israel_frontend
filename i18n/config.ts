/**
 * Locale registry. The UI ships in English, Hebrew, Arabic and Russian; the chosen
 * locale lives in a cookie (no URL prefix — every route is tenant-scoped and
 * client-rendered, so locale routing would only add redirects). Without the
 * cookie the portal opens in Hebrew; English is the source the translations
 * fall back to.
 */
export const locales = ["en", "he", "ar", "ru"] as const;
export type Locale = (typeof locales)[number];

/**
 * Language a visitor without a cookie gets, sign-in and sign-up included.
 * Hebrew rather than the browser's Accept-Language: the portal serves Israeli
 * businesses, whose browsers are routinely left in English, so that header
 * says little. The picker and a signed-in user's account language (PATCH /me,
 * useAccountLocale) take over from here.
 */
export const defaultLocale: Locale = "he";

/** English is the source of truth; every other bundle is merged over it. */
export const sourceLocale: Locale = "en";

/** Cookie read by i18n/request.ts and written by the language picker. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

const RTL_LOCALES: readonly Locale[] = ["he", "ar"];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** Each language named in its own script — what the picker shows. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  he: "עברית",
  ar: "العربية",
  ru: "Русский",
};

/**
 * BCP 47 tags for Intl date/number formatters. Latin digits in every locale
 * (ar-PS defaults to Arabic-Indic digits; ru-RU is Latin already) so money and
 * date columns stay tabular and match the API's "₪1,500.00" rendering.
 */
export const intlLocales: Record<Locale, string> = {
  en: "en-IL",
  he: "he-IL",
  ar: "ar-PS-u-nu-latn",
  ru: "ru-RU",
};
