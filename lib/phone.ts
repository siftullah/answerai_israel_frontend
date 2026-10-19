import { z } from "zod";
import type { Translator } from "@/lib/i18n/types";

/**
 * Loose IL-only shape check shared by phone inputs after stripping spaces/
 * parens/dashes: IL local (0… — 9-digit geographic, 10-digit 05X/07X),
 * 1-800/1-700/1-599/1-900-style service numbers (bare or +972-prefixed), or
 * +972… (optionally with the "(0)" people write after the country code). The
 * backend's Phone rule is the validation authority — its 422 lands on the
 * field via applyServerErrors — so this gate must never reject a number the
 * backend accepts.
 */
export const IL_PHONE_REGEX = /^(?:0\d{8,9}|1\d{9}|\+972(?:0?\d{8,9}|1\d{9}))$/;

const strip = (value: string) => value.replace(/[\s()-]/g, "");

/**
 * Canonicalize user phone input for the API: strip spacing punctuation, map
 * IL local 0… to +972…, prefix 1-800/1-700-style service numbers (which carry
 * no leading 0) with +972 whole, and drop the redundant "(0)" from
 * "+972 (0)52…". Anything else passes through unchanged.
 */
export function normalizeIlPhone(input: string): string {
  const stripped = strip(input);
  if (/^1\d{9}$/.test(stripped)) return `+972${stripped}`;
  if (stripped.startsWith("+9720")) return `+972${stripped.slice(5)}`;
  return stripped.startsWith("0") ? `+972${stripped.slice(1)}` : stripped;
}

/**
 * Required IL phone form field: strip → loose IL shape gate. `t` is a
 * translator scoped to the `validation` namespace.
 */
export function ilPhoneField(t: Translator, requiredMessage = t("phone.required")) {
  return z
    .string()
    .min(1, requiredMessage)
    .transform(strip)
    .pipe(z.string().regex(IL_PHONE_REGEX, t("phone.invalid")));
}

/** Optional variant: "" passes through (payload mappers turn it into null). */
export function optionalIlPhoneField(t: Translator) {
  return z
    .string()
    .transform(strip)
    .pipe(z.union([z.literal(""), z.string().regex(IL_PHONE_REGEX, t("phone.invalid"))]));
}

/**
 * Map a buy-number search as typed to the pattern the availability API
 * expects. A leading 0 becomes +972 so "02" matches from the start of
 * Jerusalem (02) numbers; "+972…" and bare digits (match-anywhere) pass
 * through. UI-side only — the API still receives the same E.164-shaped
 * prefix it always did.
 */
export function toAvailabilitySearchPattern(input: string): string {
  const stripped = strip(input);
  const pattern = stripped.startsWith("0") ? `+972${stripped.slice(1)}` : stripped;
  return pattern.slice(0, 16);
}

/**
 * Display formatter for E.164 numbers. Israeli numbers render the way people
 * write them locally: +972 becomes the 0 trunk prefix (052-123-4567,
 * 03-123-4567) and 1-800/1-700 service numbers drop the country code.
 * Display only — the API and DB keep E.164, and every phone input that
 * prefills this shape round-trips it through normalizeIlPhone on submit.
 * Anything it doesn't recognize passes through untouched (never worse than
 * raw E.164).
 */
export function formatE164(e164: string): string {
  const digits = e164.startsWith("+972") ? e164.slice(4) : null;
  if (!digits || !/^\d{8,}$/.test(digits)) return e164;

  // Service numbers (1-800, 1-700, 1-599, 1-900…): 1-800-123-456
  if (/^1\d{9}$/.test(digits)) {
    return `${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Mobiles (05X) and non-geographic 07X numbers: 052-123-4567
  if (/^[57]\d{8}$/.test(digits)) {
    return `0${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }

  // Geographic (02 Jerusalem, 03 Tel Aviv, 04 Haifa, 08 south, 09 Sharon): 03-123-4567
  if (/^[23489]\d{7}$/.test(digits)) {
    return `0${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4)}`;
  }

  // Anything else IL: 1… service numbers carry no trunk prefix, the rest take 0.
  return digits.startsWith("1") ? digits : `0${digits}`;
}
