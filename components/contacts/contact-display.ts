import type { Contact, ContactPhone } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";

export function primaryPhone(contact: Contact): ContactPhone | null {
  return contact.phones.find((phone) => phone.primary) ?? contact.phones[0] ?? null;
}

export function primaryEmail(contact: Contact): string | null {
  const email = contact.emails.find((entry) => entry.primary) ?? contact.emails[0];
  return email?.email ?? null;
}

/** Nameless AI-created contacts display as their number. */
export function contactDisplayName(contact: Contact): string {
  const phone = primaryPhone(contact);
  return contact.name ?? contact.company ?? (phone ? formatE164(phone.e164) : "Unnamed contact");
}

/** Initial for the gradient avatar tile; "#" for phone-only contacts. */
export function contactInitial(contact: Contact): string {
  const first = (contact.name ?? contact.company ?? "")[0] ?? "";
  return /[a-z]/i.test(first) ? first.toUpperCase() : "#";
}
