/**
 * Locale registry. The UI ships in English, Hebrew and Arabic; the chosen
 * locale lives in a cookie (no URL prefix — every route is tenant-scoped and
 * client-rendered, so locale routing would only add redirects).
 */
export const locales = ["en", "he", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

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
};

/**
 * BCP 47 tags for Intl date/number formatters. Latin digits in every locale
 * (ar-PS defaults to Arabic-Indic digits) so money and date columns stay
 * tabular and match the API's "₪1,500.00" rendering.
 */
export const intlLocales: Record<Locale, string> = {
  en: "en-IL",
  he: "he-IL",
  ar: "ar-PS-u-nu-latn",
};
