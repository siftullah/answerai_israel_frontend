import { z } from "zod";
import type {
  TransferMode,
  TransferTarget,
  TransferTargetPayload,
} from "@/lib/api/types";
import { formatE164, normalizeAuPhone, optionalAuPhoneField } from "@/lib/phone";
import {
  hourRowSchema,
  toApiHourRows,
  toEditableWeek,
  validateHourRows,
} from "@/lib/validation/weekly-hours";

export { defaultWeeklyHours, toEditableWeek } from "@/lib/validation/weekly-hours";

export const transferTargetSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Keep the name under 100 characters"),
    /** UI-only: which destination tab is active — never sent to the API. */
    destination_kind: z.enum(["member", "other"]),
    /** "" = no member picked. */
    business_member_id: z.string(),
    /** UI-only: the selected member's current saved E.164 (or ""). Never sent —
     * drives the required-number rule and the dynamic-follow override resolution. */
    member_phone: z.string(),
    // Loose AU shape gate; the backend's Phone rule stays the authority.
    to_e164: optionalAuPhoneField(),
    condition: z.string().min(1, "Describe when to transfer here").max(500, "Keep this under 500 characters"),
    post_dial_digits: z
      .string()
      .max(32, "Use 32 characters or fewer")
      .regex(/^[0-9*#w]*$/, "Digits, *, # or w only"),
    hours_mode: z.enum(["inherit", "member", "custom", "bypass"]),
    custom_hours: z.array(hourRowSchema),
  })
  .superRefine((values, ctx) => {
    if (values.destination_kind === "member" && values.business_member_id === "") {
      ctx.addIssue({
        code: "custom",
        path: ["business_member_id"],
        message: "Pick a team member",
      });
    }
    if (values.destination_kind === "other" && values.to_e164 === "") {
      ctx.addIssue({
        code: "custom",
        path: ["to_e164"],
        message: "Enter a phone number",
      });
    }
    // A member with no saved number can't be dialled — force an override number.
    // Attached to to_e164 (a Details-step field) so Next surfaces it.
    if (
      values.destination_kind === "member" &&
      values.business_member_id !== "" &&
      values.member_phone === "" &&
      values.to_e164 === ""
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["to_e164"],
        message: "This member has no saved number — enter one",
      });
    }
    // Backstop for the backend rule — the UI hides the option for "other".
    if (
      values.hours_mode === "member" &&
      (values.destination_kind !== "member" || values.business_member_id === "")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["hours_mode"],
        message: "Availability hours needs a linked team member",
      });
    }
    if (values.hours_mode === "custom") {
      validateHourRows(values.custom_hours, ctx, ["custom_hours"]);
    }
  });

export type TransferTargetValues = z.infer<typeof transferTargetSchema>;

export function toTransferTargetValues(target: TransferTarget | null): TransferTargetValues {
  const memberPhone = target?.business_member?.phone_e164 ?? "";
  const isMember = Boolean(target?.business_member);
  // Member targets prefill an explicit override, else the member's own number;
  // "other" targets carry their raw number.
  const number = isMember ? (target?.to_e164 ?? memberPhone) : (target?.to_e164 ?? "");
  return {
    name: target?.name ?? "",
    // New targets default to the member tab (as before). For an existing target,
    // member PRESENCE picks the tab — an override target (member + number) opens
    // on "member" and keeps its link instead of dropping it on save.
    destination_kind: target ? (isMember ? "member" : "other") : "member",
    business_member_id: target?.business_member?.id ?? "",
    member_phone: memberPhone,
    // Prefill in local display format (round-trips: the zod field strips
    // before validating and the payload mapper canonicalizes to E.164).
    to_e164: number ? formatE164(number) : "",
    condition: target?.condition ?? "",
    post_dial_digits: target?.post_dial_digits ?? "",
    // A member target keeps "member" availability even with an override number.
    hours_mode: target?.hours_mode ?? "inherit",
    custom_hours: toEditableWeek(target?.custom_hours),
  };
}

/**
 * The number to persist. "Other" targets send their canonicalized number.
 * Member targets follow the member's live phone unless the field holds a
 * *different* number: a value equal to the member's current phone (the kept
 * prefill) sends null so the target tracks the member instead of a snapshot.
 */
function resolveTransferNumber(values: TransferTargetValues, isMember: boolean): string | null {
  if (values.destination_kind === "other") {
    return values.to_e164 === "" ? null : normalizeAuPhone(values.to_e164);
  }
  if (!isMember || values.to_e164 === "") {
    return null;
  }
  const normalized = normalizeAuPhone(values.to_e164);
  return normalized === normalizeAuPhone(values.member_phone) ? null : normalized;
}

/** `mode` is injected on create only — a scope's targets share one mode. */
export function toTransferTargetPayload(
  values: TransferTargetValues,
  mode?: TransferMode
): TransferTargetPayload {
  const isMember =
    values.destination_kind === "member" && values.business_member_id !== "";

  return {
    name: values.name.trim(),
    // Both keys always sent, inactive side nulled — the backend update request
    // falls back to EXISTING values for absent keys, so omission keeps stale data.
    business_member_id: isMember ? values.business_member_id : null,
    // Pre-stripped by the schema transform; canonicalized to +61 E.164 here.
    to_e164: resolveTransferNumber(values, isMember),
    ...(mode ? { mode } : {}),
    condition: values.condition.trim(),
    post_dial_digits: values.post_dial_digits.trim() === "" ? null : values.post_dial_digits,
    hours_mode: values.hours_mode,
    ...(values.hours_mode === "custom"
      ? { custom_hours: toApiHourRows(values.custom_hours) }
      : {}),
  };
}
