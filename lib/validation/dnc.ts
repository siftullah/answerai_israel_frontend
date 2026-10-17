import { z } from "zod";
import type { DncEntryPayload } from "@/lib/api/types";
import { auPhoneField, formatE164, normalizeAuPhone } from "@/lib/phone";

/**
 * Loose AU shape check only — the backend normalizes AU national input itself
 * and its 422 lands on `e164` via applyServerErrors.
 */
export const dncEntrySchema = z.object({
  e164: auPhoneField("Enter the number to block"),
  reason: z.string().max(1000, "Keep the reason under 1,000 characters"),
});

export type DncEntryValues = z.infer<typeof dncEntrySchema>;

/** Prefills arrive as E.164 (a contact's number) and display locally; the payload canonicalizes. */
export function defaultDncEntryValues(e164 = ""): DncEntryValues {
  return { e164: e164 ? formatE164(e164) : "", reason: "" };
}

export function toDncEntryPayload(values: DncEntryValues): DncEntryPayload {
  const reason = values.reason.trim();
  return { e164: normalizeAuPhone(values.e164), reason: reason === "" ? null : reason };
}
