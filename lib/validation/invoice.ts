import { z } from "zod";
import type {
  Invoice,
  InvoiceItemPayload,
  StoreInvoicePayload,
  UpdateInvoicePayload,
} from "@/lib/api/types";
import { LINE_ITEM_KINDS } from "@/lib/api/types";
import { dollarsToCents, centsToDollarsInput } from "@/lib/money";

/**
 * Loose mirrors of Store/UpdateInvoiceRequest + ReplaceInvoiceItemsRequest.
 * Prices are edited in dollars and converted to integer cents at the payload
 * boundary; the VAT switch stands in for tax_rate_bp (checked = omit, so the
 * backend applies the business default rate; unchecked = 0).
 */
const invoiceItemSchema = z.object({
  kind: z.enum(LINE_ITEM_KINDS),
  description: z
    .string()
    .trim()
    .min(1, "Describe the work or part")
    .max(300, "Keep the description under 300 characters"),
  quantity: z.string().refine((value) => {
    const quantity = Number(value);
    return value.trim() !== "" && Number.isFinite(quantity) && quantity > 0 && quantity <= 99999;
  }, "Enter a quantity above zero"),
  unit_price: z
    .string()
    .refine((value) => dollarsToCents(value) !== null, "Enter a price like 180 or 180.50"),
  gst: z.boolean(),
});

export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;

export const invoiceFormSchema = z
  .object({
    contact_id: z.string().min(1, "Choose a contact"),
    /** Calendar keys "YYYY-MM-DD", "" = set on send. */
    issue_date: z.string(),
    due_date: z.string(),
    notes: z.string().max(5000, "Keep the notes under 5,000 characters"),
    payment_instructions: z
      .string()
      .max(2000, "Keep the payment instructions under 2,000 characters"),
    items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
  })
  .superRefine((values, ctx) => {
    // The backend's after_or_equal:issue_date rejects a due date with no
    // issue date, so mirror both constraints here.
    if (values.due_date && !values.issue_date) {
      ctx.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Set an issue date first, or leave both to fill on send",
      });
    }
    if (values.issue_date && values.due_date && values.due_date < values.issue_date) {
      ctx.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "The due date can't be before the issue date",
      });
    }
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function emptyInvoiceItem(): InvoiceItemFormValues {
  return { kind: "labour", description: "", quantity: "1", unit_price: "", gst: true };
}

export function defaultInvoiceValues(): InvoiceFormValues {
  return {
    contact_id: "",
    issue_date: "",
    due_date: "",
    notes: "",
    payment_instructions: "",
    items: [emptyInvoiceItem()],
  };
}

/** "5.00" → "5", "1.50" → "1.5" — quantity inputs shouldn't echo cast noise. */
function trimQuantity(quantity: string): string {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? String(parsed) : quantity;
}

export function invoiceToFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    contact_id: invoice.contact?.id ?? "",
    issue_date: invoice.issue_date ?? "",
    due_date: invoice.due_date ?? "",
    notes: invoice.notes ?? "",
    payment_instructions: invoice.payment_instructions ?? "",
    items: (invoice.items ?? []).map((item) => ({
      kind: item.kind,
      description: item.description,
      quantity: trimQuantity(item.quantity),
      unit_price: centsToDollarsInput(item.unit_price_cents),
      gst: item.tax_rate_bp > 0,
    })),
  };
}

export function toInvoiceItemsPayload(items: InvoiceItemFormValues[]): InvoiceItemPayload[] {
  return items.map((item) => ({
    kind: item.kind,
    description: item.description.trim(),
    quantity: Number(item.quantity),
    unit_price_cents: dollarsToCents(item.unit_price) ?? 0,
    ...(item.gst ? {} : { tax_rate_bp: 0 }),
  }));
}

export function toStoreInvoicePayload(values: InvoiceFormValues): StoreInvoicePayload {
  const notes = values.notes.trim();
  const instructions = values.payment_instructions.trim();
  return {
    contact_id: values.contact_id,
    ...(values.issue_date ? { issue_date: values.issue_date } : {}),
    ...(values.due_date ? { due_date: values.due_date } : {}),
    ...(notes ? { notes } : {}),
    // Omitted = the backend prefills from module settings; only send what's typed.
    ...(instructions ? { payment_instructions: instructions } : {}),
    items: toInvoiceItemsPayload(values.items),
  };
}

/** PATCH counterpart — explicit nulls clear stored values. */
export function toUpdateInvoicePayload(values: InvoiceFormValues): UpdateInvoicePayload {
  return {
    contact_id: values.contact_id,
    issue_date: values.issue_date || null,
    due_date: values.due_date || null,
    notes: values.notes.trim() || null,
    payment_instructions: values.payment_instructions.trim() || null,
  };
}

export interface InvoiceTotals {
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
}

/** Live footer preview — mirrors InvoiceItemService::recompute exactly. */
export function computeInvoiceTotals(
  items: InvoiceItemFormValues[],
  taxRateBp: number
): InvoiceTotals {
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitPrice = dollarsToCents(item.unit_price);
    if (!Number.isFinite(quantity) || quantity <= 0 || unitPrice === null) continue;

    const amount = Math.round(quantity * unitPrice);
    subtotal += amount;
    if (item.gst) tax += Math.round((amount * taxRateBp) / 10000);
  }

  return { subtotal_cents: subtotal, tax_cents: tax, total_cents: subtotal + tax };
}
