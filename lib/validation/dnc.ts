import { z } from "zod";
import type { DncEntryPayload } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { auPhoneField, formatE164, normalizeAuPhone } from "@/lib/phone";

/**
 * Loose AU shape check only — the backend normalizes AU national input itself
 * and its 422 lands on `e164` via applyServerErrors. `t` is a translator
 * scoped to the `validation` namespace.
 */
export function dncEntrySchema(t: Translator) {
  return z.object({
    e164: auPhoneField(t, t("dnc.numberRequired")),
    reason: z.string().max(1000, t("length.reason", { max: 1000 })),
  });
}

export type DncEntryValues = z.infer<ReturnType<typeof dncEntrySchema>>;

/** Prefills arrive as E.164 (a contact's number) and display locally; the payload canonicalizes. */
export function defaultDncEntryValues(e164 = ""): DncEntryValues {
  return { e164: e164 ? formatE164(e164) : "", reason: "" };
}

export function toDncEntryPayload(values: DncEntryValues): DncEntryPayload {
  const reason = values.reason.trim();
  return { e164: normalizeAuPhone(values.e164), reason: reason === "" ? null : reason };
}
