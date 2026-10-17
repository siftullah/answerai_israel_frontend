/** Mirrors app/Http/Resources/ContactResource.php */

export const CONTACT_SOURCES = ["manual", "ai"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const PHONE_LABELS = ["mobile", "work", "home", "other"] as const;
export type PhoneLabel = (typeof PHONE_LABELS)[number];

export interface ContactPhone {
  e164: string;
  label: PhoneLabel | null;
  primary: boolean;
}

/** The `label` key is omitted entirely when unset. */
export interface ContactEmail {
  email: string;
  label?: string | null;
  primary: boolean;
}

export interface Contact {
  id: string;
  name: string | null;
  company: string | null;
  phones: ContactPhone[];
  emails: ContactEmail[];
  address: string | null;
  tags: string[];
  source: ContactSource;
  last_call_at: string | null;
  /** Server-side join against the business's live DNC entries. */
  on_dnc: boolean;
  created_at: string;
  updated_at: string;
}

/** POST/PATCH body — backend rules are sometimes|nullable throughout.
 * Always send full phones/emails/tags arrays so PATCH can clear them. */
export interface ContactPayload {
  name?: string | null;
  company?: string | null;
  phones?: { e164: string; label?: PhoneLabel | null; primary: boolean }[];
  emails?: { email: string; label?: string | null; primary: boolean }[];
  address?: string | null;
  tags?: string[];
}

export interface ContactListFilters {
  q?: string;
  tag?: string;
  source?: ContactSource;
  has_name?: boolean;
  sort?: "newest" | "oldest";
}

export const CONTACT_BULK_ACTIONS = ["delete", "tag", "untag", "dnc"] as const;
export type ContactBulkAction = (typeof CONTACT_BULK_ACTIONS)[number];

/** Exactly one of ids/filters. Empty filters {} legitimately targets every
 * contact; `affected` counts only rows actually written (phone-less contacts
 * are skipped by the dnc action). */
export interface ContactBulkPayload {
  action: ContactBulkAction;
  ids?: string[];
  filters?: ContactListFilters;
  tag?: string;
  reason?: string;
}

export interface ContactBulkResult {
  affected: number;
}

export interface ContactImportPreview {
  token: string;
  columns: { index: number; header: string }[];
  sample_rows: string[][];
  expires_in_minutes: number;
}

/** Values are 0-based column indexes from the preview; phones/emails accept
 * several columns each. At least one phone column is required. */
export interface ContactImportMapping {
  phones: number[];
  emails?: number[];
  name?: number;
  company?: number;
  address?: number;
  tags?: number;
}

export interface ContactImportPayload {
  token: string;
  has_header_row: boolean;
  mapping: ContactImportMapping;
}
