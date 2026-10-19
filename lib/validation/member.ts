import { z } from "zod";
import type {
  BusinessMember,
  StoreMemberPayload,
  UpdateMemberPayload,
} from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { formatE164, normalizeIlPhone, optionalIlPhoneField } from "@/lib/phone";
import {
  hourRowSchema,
  toApiHourRows,
  toEditableWeek,
  validateHourRows,
} from "@/lib/validation/weekly-hours";

/** Schema factories take a translator scoped to the `validation` namespace. */
export function memberSchema(t: Translator) {
  return z
    .object({
      first_name: z
        .string()
        .min(1, t("common.firstNameRequired"))
        .max(100, t("length.firstName", { max: 100 })),
      last_name: z
        .string()
        .min(1, t("common.lastNameRequired"))
        .max(100, t("length.lastName", { max: 100 })),
      email: z.email(t("common.emailInvalid")),
      // Loose AU shape gate; the backend's Phone rule stays the authority.
      phone_e164: optionalIlPhoneField(t),
      position: z.string().max(150, t("length.position", { max: 150 })),
      /** "" = default member role. */
      role_id: z.string(),
      /** UI-only: whether the member follows the trading hours or a custom week. */
      hours_mode: z.enum(["inherit", "custom"]),
      calling_hours: z.array(hourRowSchema),
    })
    .superRefine((values, ctx) => {
      if (values.hours_mode === "custom") {
        validateHourRows(t, values.calling_hours, ctx, ["calling_hours"]);
      }
    });
}

export type MemberValues = z.infer<ReturnType<typeof memberSchema>>;

export function toMemberValues(member: BusinessMember | null): MemberValues {
  const saved = member?.calling_hours ?? [];
  return {
    // Linked accounts own their identity — the member row's columns are NULL
    // and the account ships under member.user. Display-only: the fields stay
    // disabled (accountLocked) and toUpdateMemberPayload never sends them.
    first_name: member?.first_name ?? member?.user?.first_name ?? "",
    last_name: member?.last_name ?? member?.user?.last_name ?? "",
    email: member?.email ?? "",
    phone_e164: member?.phone_e164 ? formatE164(member.phone_e164) : "",
    position: member?.position ?? "",
    // System owner/member roles collapse to "" (the select's "default" item);
    // toUpdateMemberPayload maps "" → null and omits role_id for owners.
    role_id:
      member?.role && (member.role.slug === "owner" || member.role.slug === "member")
        ? ""
        : (member?.role?.id ?? ""),
    hours_mode: saved.length > 0 ? "custom" : "inherit",
    calling_hours: toEditableWeek(saved),
  };
}

export function toStoreMemberPayload(values: MemberValues): StoreMemberPayload {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: values.email.trim(),
    // Pre-stripped by the schema transform; canonicalized to +972 E.164 here.
    phone_e164: values.phone_e164 === "" ? null : normalizeIlPhone(values.phone_e164),
    position: values.position.trim() === "" ? null : values.position.trim(),
    role_id: values.role_id === "" ? null : values.role_id,
    // Absent = the backend default (follows business hours) — only custom weeks travel.
    ...(values.hours_mode === "custom"
      ? { calling_hours: toApiHourRows(values.calling_hours) }
      : {}),
  };
}

export function toUpdateMemberPayload(
  values: MemberValues,
  opts: { accountLocked: boolean; isOwner: boolean }
): UpdateMemberPayload {
  return {
    phone_e164: values.phone_e164 === "" ? null : normalizeIlPhone(values.phone_e164),
    position: values.position.trim() === "" ? null : values.position.trim(),
    // Account-linked identity fields belong to the member's account —
    // the backend rejects them, so they're never sent.
    ...(opts.accountLocked
      ? {}
      : {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
        }),
    ...(opts.isOwner ? {} : { role_id: values.role_id === "" ? null : values.role_id }),
    // Always sent on edit: rows replace the saved week, null clears it back
    // to the trading-hours fallback.
    calling_hours:
      values.hours_mode === "custom" ? toApiHourRows(values.calling_hours) : null,
  };
}

/** Dotted calling-hours 422 keys land on the editor's top-level field. */
export function memberServerFieldKey(key: string): string {
  return key.startsWith("calling_hours.") ? "calling_hours" : key;
}

/** Email/phone come from the invited member's row — only the role is chosen. */
export function inviteSchema(t: Translator) {
  return z.object({
    role_id: z.string().min(1, t("member.roleRequired")),
  });
}

export type InviteValues = z.infer<ReturnType<typeof inviteSchema>>;
