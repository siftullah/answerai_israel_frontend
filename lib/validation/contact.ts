import { z } from "zod";
import type { Contact, ContactPayload } from "@/lib/api/types";
import { PHONE_LABELS } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { auPhoneField, formatE164, normalizeAuPhone } from "@/lib/phone";

/** "none" is the unlabelled sentinel — Base UI Select can't hold null. */
export const PHONE_LABEL_OPTIONS = ["none", ...PHONE_LABELS] as const;

function phoneRow(t: Translator) {
  return z.object({
    e164: auPhoneField(t),
    label: z.enum(PHONE_LABEL_OPTIONS),
    primary: z.boolean(),
  });
}

function emailRow(t: Translator) {
  return z.object({
    email: z.email(t("common.emailInvalid")),
    label: z.string().max(255, t("length.label", { max: 255 })),
    primary: z.boolean(),
  });
}

/**
 * Loose mirror of the backend rules (which stay the validation authority via
 * applyServerErrors): at least one of name/company/phone identifies the
 * contact, and each non-empty phones/emails array has exactly one primary.
 * `t` is a translator scoped to the `validation` namespace.
 */
export function contactSchema(t: Translator) {
  return z
    .object({
      name: z.string().max(255, t("length.name", { max: 255 })),
      company: z.string().max(255, t("length.company", { max: 255 })),
      phones: z.array(phoneRow(t)).max(10, t("count.phoneNumbers", { max: 10 })),
      emails: z.array(emailRow(t)).max(10, t("count.emails", { max: 10 })),
      address: z.string().max(1000, t("length.address", { max: 1000 })),
      tags: z.array(z.string().max(40)).max(30, t("count.tags", { max: 30 })),
    })
    .superRefine((values, ctx) => {
      if (
        values.name.trim() === "" &&
        values.company.trim() === "" &&
        values.phones.length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: t("contact.identityRequired"),
        });
      }
      for (const key of ["phones", "emails"] as const) {
        const rows = values[key];
        if (rows.length > 0 && rows.filter((row) => row.primary).length !== 1) {
          ctx.addIssue({ code: "custom", path: [key], message: t("contact.primaryRequired") });
        }
      }
    });
}

export type ContactValues = z.infer<ReturnType<typeof contactSchema>>;

export function defaultContactPhone(primary: boolean): ContactValues["phones"][number] {
  return { e164: "", label: "none", primary };
}

export function defaultContactEmail(primary: boolean): ContactValues["emails"][number] {
  return { email: "", label: "", primary };
}

export function toContactValues(source: Contact | null): ContactValues {
  return {
    name: source?.name ?? "",
    company: source?.company ?? "",
    phones:
      source?.phones.map((phone) => ({
        e164: formatE164(phone.e164),
        label: phone.label ?? "none",
        primary: phone.primary,
      })) ?? [],
    emails:
      source?.emails.map((email) => ({
        email: email.email,
        label: email.label ?? "",
        primary: email.primary,
      })) ?? [],
    address: source?.address ?? "",
    tags: source?.tags ?? [],
  };
}

/** Arrays are always sent in full so PATCH can clear them. */
export function toContactPayload(values: ContactValues): ContactPayload {
  const name = values.name.trim();
  const company = values.company.trim();
  const address = values.address.trim();
  return {
    name: name === "" ? null : name,
    company: company === "" ? null : company,
    phones: values.phones.map((row) => ({
      e164: normalizeAuPhone(row.e164),
      label: row.label === "none" ? null : row.label,
      primary: row.primary,
    })),
    emails: values.emails.map((row) => {
      const label = row.label.trim();
      return { email: row.email.trim(), label: label === "" ? null : label, primary: row.primary };
    }),
    address: address === "" ? null : address,
    tags: values.tags,
  };
}
