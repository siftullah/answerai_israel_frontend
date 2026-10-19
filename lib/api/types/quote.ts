/** Mirrors app/Http/Resources/QuoteResource.php */

import { labelMap } from "@/lib/i18n/label-map";
import type { CustomerLocale } from "./business-profile";
import type { LineItemKind } from "./invoice";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "void",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** The Open tab's status set — quotes still in play. */
export const OPEN_QUOTE_STATUSES: readonly QuoteStatus[] = ["draft", "sent"];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = labelMap(
  "lib.quoteStatus",
  ["draft", "sent", "accepted", "declined", "expired", "void"]
);

export type QuoteDepositType = "percent" | "fixed";
export type QuoteAcceptedVia = "portal" | "public_link";
export type QuoteSource = "manual" | "agent_call";

export interface QuoteContactRef {
  id: string;
  name: string;
}

export interface QuoteLeadRef {
  id: string;
  title: string;
}

export interface QuoteInvoiceRef {
  id: string;
  number: string;
  status: string;
}

export interface QuoteJobRef {
  id: string;
  /** Customer-facing reference, e.g. "JOB-4". */
  reference: string;
  title: string;
  status: string;
}

export interface QuoteItem {
  id: string;
  kind: LineItemKind;
  /** Laravel's decimal cast serializes as a string, e.g. "5.00". */
  quantity: string;
  description: string;
  unit_price_cents: number;
  /** Basis points — 1800 = 18% VAT. */
  tax_rate_bp: number;
  amount_cents: number;
  position: number;
}

export interface Quote {
  id: string;
  number: string;
  status: QuoteStatus;
  /** Customer-facing subject, e.g. "Kitchen rewire". */
  title: string | null;
  /** Calendar date "YYYY-MM-DD"; null until set (send fills both). */
  issue_date: string | null;
  valid_until: string | null;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_type: QuoteDepositType | null;
  /** Percent (0–100) for "percent", cents for "fixed". */
  deposit_value: number | null;
  deposit_cents: number;
  notes: string | null;
  terms: string | null;
  /** Never shown to the customer. */
  internal_notes: string | null;
  source: QuoteSource;
  /** The customer's accept-link (frontend /q/{token}). */
  public_url: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  expired_at: string | null;
  voided_at: string | null;
  decline_reason: string | null;
  accepted_via: QuoteAcceptedVia | null;
  contact: QuoteContactRef | null;
  /** Only loaded on the detail endpoint. */
  lead?: QuoteLeadRef | null;
  /** Invoices converted from this quote — only loaded on the detail endpoint. */
  invoices?: QuoteInvoiceRef[];
  /** Jobs converted from this quote (at most one) — only loaded on the detail endpoint. */
  jobs?: QuoteJobRef[];
  /** Only loaded on the detail endpoint and mutation responses. */
  items?: QuoteItem[];
  created_at: string;
  updated_at: string;
}

/** Effective quotes-module settings from GET modules/quotes/settings. */
export interface QuoteModuleSettings {
  valid_days: number;
  terms?: string | null;
  from_details?: string | null;
}

export interface QuoteCounts {
  open: number;
  draft: number;
  awaiting: number;
  expiring_soon: number;
  expired: number;
  accepted: number;
  all: number;
  open_value_cents: number;
  accepted_this_month_cents: number;
  /** Trailing-90-day win-rate inputs: won ÷ (won + lost + lapsed). */
  accepted_90d: number;
  declined_90d: number;
  expired_90d: number;
}

/** Index filters — `status` takes a comma-joined list (backend whereIn). */
export interface QuoteListFilters {
  status?: string;
  contact_id?: string;
  q?: string;
}

export interface QuoteItemPayload {
  description: string;
  quantity: number;
  unit_price_cents: number;
  /** Omitted = the business's default rate (VAT for IL). */
  tax_rate_bp?: number;
  kind?: LineItemKind;
}

export interface StoreQuotePayload {
  contact_id: string;
  /** Links the draft back to the lead it prices up. */
  lead_id?: string;
  title?: string;
  currency?: string;
  issue_date?: string;
  valid_until?: string;
  notes?: string;
  terms?: string;
  internal_notes?: string;
  deposit_type?: QuoteDepositType;
  deposit_value?: number;
  items?: QuoteItemPayload[];
}

/** Draft-only; items go through PUT …/items, status through the verbs. */
export interface UpdateQuotePayload {
  contact_id?: string;
  title?: string | null;
  issue_date?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  internal_notes?: string | null;
  deposit_type?: QuoteDepositType | null;
  deposit_value?: number | null;
}

/** Mirrors app/Http/Resources/PublicQuoteResource.php — the /q/{token} shape. */
export interface PublicQuote {
  number: string;
  status: QuoteStatus;
  title: string | null;
  issue_date: string | null;
  valid_until: string | null;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  tax_label: string;
  total_cents: number;
  deposit_type: QuoteDepositType | null;
  deposit_value: number | null;
  deposit_cents: number;
  notes: string | null;
  terms: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  items: QuoteItem[];
  /**
   * The business's customer language (BusinessProfile.customer_locale) — the
   * emailed link carries it as ?lang=, which proxy.ts turns into the UI
   * locale. Absent until the API ships it; not read by the page yet.
   */
  locale?: CustomerLocale;
  contact: { name: string };
  business: {
    name: string;
    timezone: string;
    logo_url: string | null;
    public_email: string | null;
    public_phone: string | null;
    from_details: string | null;
  };
}
