import { createTranslator, type AbstractIntlMessages } from "next-intl";
import { defaultLocale, intlLocales, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import type { Translator } from "./types";

/**
 * Translations for code that runs outside React: date/money formatters,
 * the API error normalizer, catalog label maps. The Providers tree calls
 * setRuntimeI18n() with the active locale and messages on every render, so
 * `rt()` always matches what the components around it show.
 *
 * Keys are full paths ("lib.datetime.today"). Module-level state is shared
 * across concurrent server renders, which is acceptable here: every string
 * these helpers produce is rendered client-side after data loads.
 */
interface Runtime {
  locale: Locale;
  messages: Messages | null;
  t: Translator;
}

let runtime: Runtime = {
  locale: defaultLocale,
  messages: null,
  t: (key) => key,
};

export function setRuntimeI18n(locale: Locale, messages: Messages): void {
  if (runtime.locale === locale && runtime.messages === messages) return;
  // Untyped keys on purpose: this translator serves every namespace.
  const translator = createTranslator({
    locale,
    messages: messages as AbstractIntlMessages,
  }) as unknown as Translator;
  runtime = { locale, messages, t: translator };
}

/** Translate a full key path, e.g. rt("lib.money.noPrice"). */
export const rt: Translator = (key, values) => runtime.t(key, values);

export function runtimeLocale(): Locale {
  return runtime.locale;
}

/** BCP 47 tag for Intl formatters in the active locale (Latin digits). */
export function displayLocale(): string {
  return intlLocales[runtime.locale];
}
