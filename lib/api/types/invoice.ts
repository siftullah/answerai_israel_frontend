/** Mirrors app/Http/Resources/InvoiceResource.php */

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** The Open tab's status set — everything not yet settled. */
export const OPEN_INVOICE_STATUSES: readonly InvoiceStatus[] = ["draft", "sent", "overdue"];

/** Sent and not yet paid — the "outstanding" money. */
export const AWAITING_PAYMENT_INVOICE_STATUSES: readonly InvoiceStatus[] = ["sent", "overdue"];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export const LINE_ITEM_KINDS = ["labour", "material"] as const;
export type LineItemKind = (typeof LINE_ITEM_KINDS)[number];

export const LINE_ITEM_KIND_LABELS: Record<LineItemKind, string> = {
  labour: "Labour",
  material: "Material",
};

export interface InvoiceContactRef {
  id: string;
  name: string;
}

export interface InvoiceJobRef {
  id: string;
  /** Customer-facing reference, e.g. "JOB-4". */
  reference: string;
}

export interface InvoiceItem {
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

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  /** Calendar date "YYYY-MM-DD"; null until set (send fills both). */
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string | null;
  payment_instructions: string | null;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  payment_reference: string | null;
  contact: InvoiceContactRef | null;
  /** Only loaded on the detail endpoint. */
  job?: InvoiceJobRef | null;
  /** Only loaded on the detail endpoint and mutation responses. */
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

/**
 * Effective invoices-module settings from GET modules/invoices/settings.
 * Tax defaults (rate + label) live on the business profile, not here.
 */
export interface InvoiceModuleSettings {
  net_days: number;
  payment_instructions?: string | null;
  from_details?: string | null;
}

export interface InvoiceCounts {
  open: number;
  awaiting_payment: number;
  overdue: number;
  paid: number;
  all: number;
  outstanding_cents: number;
  overdue_cents: number;
  paid_this_month_cents: number;
}

/** Index filters — `status` takes a comma-joined list (backend whereIn). */
export interface InvoiceListFilters {
  status?: string;
  contact_id?: string;
  issue_after?: string;
  issue_before?: string;
  overdue_only?: boolean;
  q?: string;
}

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  unit_price_cents: number;
  /** Omitted = the module's default rate (VAT for IL). */
  tax_rate_bp?: number;
  kind?: LineItemKind;
}

export interface StoreInvoicePayload {
  contact_id: string;
  currency?: string;
  issue_date?: string;
  due_date?: string;
  notes?: string;
  payment_instructions?: string;
  items?: InvoiceItemPayload[];
}

/** Draft-only; items go through PUT …/items, status through the verbs. */
export interface UpdateInvoicePayload {
  contact_id?: string;
  issue_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  payment_instructions?: string | null;
}
