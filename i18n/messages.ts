import { defaultLocale, type Locale } from "./config";

/**
 * Messages are split by namespace: messages/<locale>/<namespace>.json. Each
 * area of the portal owns one namespace (see the matching messages/<locale>.ts
 * index). Every locale's bundle is deep-merged over English so a string that
 * has not been translated yet renders in English instead of as its key path.
 */
export type Messages = Record<string, unknown>;

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import("../messages/en"),
  he: () => import("../messages/he"),
  ar: () => import("../messages/ar"),
  ru: () => import("../messages/ru"),
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    out[key] =
      isPlainObject(existing) && isPlainObject(value)
        ? deepMerge(existing, value)
        : value;
  }
  return out;
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  const base = (await loaders[defaultLocale]()).default;
  if (locale === defaultLocale) return base;
  const localized = (await loaders[locale]()).default;
  return deepMerge(base, localized);
}
