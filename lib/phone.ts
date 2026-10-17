import { z } from "zod";

/**
 * Loose AU-only shape check shared by phone inputs after stripping spaces/
 * parens/dashes: AU local (0…), 1300/1800 and 13xxxx shared-cost numbers
 * (bare or +61-prefixed), or +61…. The backend's Phone rule is the validation
 * authority — its 422 lands on the field via applyServerErrors — so this gate
 * must never reject a number the backend accepts.
 */
export const AU_PHONE_REGEX =
  /^(?:0\d{9}|1[38]00\d{6}|13\d{4}|\+61(?:\d{9}|1[38]00\d{6}|13\d{4}))$/;

export const AU_PHONE_MESSAGE =
  "Enter an Australian phone number, e.g. 0412 345 678";

const strip = (value: string) => value.replace(/[\s()-]/g, "");

/**
 * Canonicalize user phone input for the API: strip spacing punctuation, map
 * AU local 0… to +61…, and prefix 1300/1800/13xxxx numbers (which carry no
 * leading 0) with +61 whole. Anything else passes through unchanged.
 */
export function normalizeAuPhone(input: string): string {
  const stripped = strip(input);
  if (/^(?:1[38]00\d{6}|13\d{4})$/.test(stripped)) return `+61${stripped}`;
  return stripped.startsWith("0") ? `+61${stripped.slice(1)}` : stripped;
}

/** Required AU phone form field: strip → loose AU shape gate. */
export function auPhoneField(requiredMessage = "Enter a phone number") {
  return z
    .string()
    .min(1, requiredMessage)
    .transform(strip)
    .pipe(z.string().regex(AU_PHONE_REGEX, AU_PHONE_MESSAGE));
}

/** Optional variant: "" passes through (payload mappers turn it into null). */
export function optionalAuPhoneField() {
  return z
    .string()
    .transform(strip)
    .pipe(z.union([z.literal(""), z.string().regex(AU_PHONE_REGEX, AU_PHONE_MESSAGE)]));
}

/**
 * Map a buy-number search as typed to the pattern the availability API
 * expects. A leading 0 becomes +61 so "02" matches from the start of (02)
 * numbers; "+61…" and bare digits (match-anywhere) pass through. UI-side
 * only — the API still receives the same E.164-shaped prefix it always did.
 */
export function toAvailabilitySearchPattern(input: string): string {
  const stripped = input.replace(/\s+/g, "");
  const pattern = stripped.startsWith("0") ? `+61${stripped.slice(1)}` : stripped;
  return pattern.slice(0, 16);
}

/**
 * Display formatter for E.164 numbers. Australian numbers render the way
 * people write them locally: +61 becomes the 0 trunk prefix (0412 345 678,
 * 02 1234 5678) and 1300/1800/13 numbers drop the country code. Display
 * only — the API and DB keep E.164, and every phone input that prefills
 * this shape round-trips it through normalizeAuPhone on submit. Anything
 * it doesn't recognize passes through untouched (never worse than raw E.164).
 */
export function formatE164(e164: string): string {
  const digits = e164.startsWith("+61") ? e164.slice(3) : null;
  if (!digits || !/^\d+$/.test(digits)) return e164;

  // 1300/1800 inbound numbers: 1300 123 456
  if (/^1[38]00\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // 13 short numbers: 13 12 34
  if (/^13\d{4}$/.test(digits)) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  }

  // Mobiles: 0412 345 678
  if (/^4\d{8}$/.test(digits)) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Geographic: 02 1234 5678
  if (/^[2378]\d{8}$/.test(digits)) {
    return `0${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  }

  // Anything else AU: 1xx… numbers carry no trunk prefix, the rest take 0.
  return digits.startsWith("1") ? digits : `0${digits}`;
}
