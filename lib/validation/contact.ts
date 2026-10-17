import { z } from "zod";
import type { Contact, ContactPayload } from "@/lib/api/types";
import { PHONE_LABELS } from "@/lib/api/types";
import { auPhoneField, formatE164, normalizeAuPhone } from "@/lib/phone";

/** "none" is the unlabelled sentinel — Base UI Select can't hold null. */
export const PHONE_LABEL_OPTIONS = ["none", ...PHONE_LABELS] as const;

const phoneRow = z.object({
  e164: auPhoneField("Enter a phone number"),
  label: z.enum(PHONE_LABEL_OPTIONS),
  primary: z.boolean(),
});

const emailRow = z.object({
  email: z.email("Enter a valid email address"),
  label: z.string().max(255, "Keep the label under 255 characters"),
  primary: z.boolean(),
});

/**
 * Loose mirror of the backend rules (which stay the validation authority via
 * applyServerErrors): at least one of name/company/phone identifies the
 * contact, and each non-empty phones/emails array has exactly one primary.
 */
export const contactSchema = z
  .object({
    name: z.string().max(255, "Keep the name under 255 characters"),
    company: z.string().max(255, "Keep the company under 255 characters"),
    phones: z.array(phoneRow).max(10, "Up to 10 phone numbers"),
    emails: z.array(emailRow).max(10, "Up to 10 email addresses"),
    address: z.string().max(1000, "Keep the address under 1,000 characters"),
    tags: z.array(z.string().max(40)).max(30, "Up to 30 tags"),
  })
  .superRefine((values, ctx) => {
    if (values.name.trim() === "" && values.company.trim() === "" && values.phones.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Add a name, company or phone number",
      });
    }
    for (const key of ["phones", "emails"] as const) {
      const rows = values[key];
      if (rows.length > 0 && rows.filter((row) => row.primary).length !== 1) {
        ctx.addIssue({ code: "custom", path: [key], message: "Mark exactly one as primary" });
      }
    }
  });

export type ContactValues = z.infer<typeof contactSchema>;

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
