import { z } from "zod";
import type {
  Quote,
  QuoteDepositType,
  QuoteItemPayload,
  StoreQuotePayload,
  UpdateQuotePayload,
} from "@/lib/api/types";
import { LINE_ITEM_KINDS } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { dollarsToCents, centsToDollarsInput } from "@/lib/money";

/**
 * Loose mirrors of Store/UpdateQuoteRequest + ReplaceQuoteItemsRequest.
 * Prices are edited in dollars and converted to integer cents at the payload
 * boundary; the VAT switch stands in for tax_rate_bp (checked = omit, so the
 * backend applies the business default rate; unchecked = 0). The deposit is
 * "none" | percent (whole %) | fixed (dollars → cents). Schema factories take
 * a translator scoped to the `validation` namespace.
 */
function quoteItemSchema(t: Translator) {
  return z.object({
    kind: z.enum(LINE_ITEM_KINDS),
    description: z
      .string()
      .trim()
      .min(1, t("lineItem.descriptionRequired"))
      .max(300, t("length.description", { max: 300 })),
    quantity: z.string().refine((value) => {
      const quantity = Number(value);
      return value.trim() !== "" && Number.isFinite(quantity) && quantity > 0 && quantity <= 99999;
    }, t("lineItem.quantityInvalid")),
    unit_price: z
      .string()
      .refine((value) => dollarsToCents(value) !== null, t("lineItem.unitPriceInvalid")),
    gst: z.boolean(),
  });
}

export type QuoteItemFormValues = z.infer<ReturnType<typeof quoteItemSchema>>;

export function quoteFormSchema(t: Translator) {
  return z
    .object({
      contact_id: z.string().min(1, t("common.contactRequired")),
      title: z.string().max(200, t("length.title", { max: 200 })),
      /** Calendar keys "YYYY-MM-DD", "" = set on send. */
      issue_date: z.string(),
      valid_until: z.string(),
      notes: z.string().max(5000, t("length.notes", { max: 5000 })),
      terms: z.string().max(5000, t("length.terms", { max: 5000 })),
      internal_notes: z.string().max(5000, t("length.internalNotes", { max: 5000 })),
      deposit_type: z.enum(["none", "percent", "fixed"]),
      deposit_value: z.string(),
      items: z.array(quoteItemSchema(t)).min(1, t("lineItem.itemsRequired")),
    })
    .superRefine((values, ctx) => {
      if (values.valid_until && !values.issue_date) {
        ctx.addIssue({
          code: "custom",
          path: ["valid_until"],
          message: t("common.issueDateFirst"),
        });
      }
      if (values.issue_date && values.valid_until && values.valid_until < values.issue_date) {
        ctx.addIssue({
          code: "custom",
          path: ["valid_until"],
          message: t("quote.validUntilBeforeIssue"),
        });
      }
      if (values.deposit_type === "percent") {
        const percent = Number(values.deposit_value);
        if (
          values.deposit_value.trim() === "" ||
          !Number.isInteger(percent) ||
          percent < 1 ||
          percent > 100
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["deposit_value"],
            message: t("quote.depositPercentRange", { min: 1, max: 100 }),
          });
        }
      }
      if (values.deposit_type === "fixed" && dollarsToCents(values.deposit_value) === null) {
        ctx.addIssue({
          code: "custom",
          path: ["deposit_value"],
          message: t("quote.depositAmountInvalid"),
        });
      }
    });
}

export type QuoteFormValues = z.infer<ReturnType<typeof quoteFormSchema>>;

export function emptyQuoteItem(): QuoteItemFormValues {
  return { kind: "labour", description: "", quantity: "1", unit_price: "", gst: true };
}

export function defaultQuoteValues(): QuoteFormValues {
  return {
    contact_id: "",
    title: "",
    issue_date: "",
    valid_until: "",
    notes: "",
    terms: "",
    internal_notes: "",
    deposit_type: "none",
    deposit_value: "",
    items: [emptyQuoteItem()],
  };
}

/** "5.00" → "5", "1.50" → "1.5" — quantity inputs shouldn't echo cast noise. */
function trimQuantity(quantity: string): string {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? String(parsed) : quantity;
}

export function quoteToFormValues(quote: Quote): QuoteFormValues {
  return {
    contact_id: quote.contact?.id ?? "",
    title: quote.title ?? "",
    issue_date: quote.issue_date ?? "",
    valid_until: quote.valid_until ?? "",
    notes: quote.notes ?? "",
    terms: quote.terms ?? "",
    internal_notes: quote.internal_notes ?? "",
    deposit_type: quote.deposit_type ?? "none",
    deposit_value:
      quote.deposit_type === "percent"
        ? String(quote.deposit_value ?? "")
        : quote.deposit_type === "fixed"
          ? centsToDollarsInput(quote.deposit_value)
          : "",
    items: (quote.items ?? []).map((item) => ({
      kind: item.kind,
      description: item.description,
      quantity: trimQuantity(item.quantity),
      unit_price: centsToDollarsInput(item.unit_price_cents),
      gst: item.tax_rate_bp > 0,
    })),
  };
}

export function toQuoteItemsPayload(items: QuoteItemFormValues[]): QuoteItemPayload[] {
  return items.map((item) => ({
    kind: item.kind,
    description: item.description.trim(),
    quantity: Number(item.quantity),
    unit_price_cents: dollarsToCents(item.unit_price) ?? 0,
    ...(item.gst ? {} : { tax_rate_bp: 0 }),
  }));
}

function depositPayload(values: QuoteFormValues): {
  deposit_type?: QuoteDepositType;
  deposit_value?: number;
} {
  if (values.deposit_type === "percent") {
    return { deposit_type: "percent", deposit_value: Number(values.deposit_value) };
  }
  if (values.deposit_type === "fixed") {
    return { deposit_type: "fixed", deposit_value: dollarsToCents(values.deposit_value) ?? 0 };
  }
  return {};
}

export function toStoreQuotePayload(values: QuoteFormValues): StoreQuotePayload {
  const title = values.title.trim();
  const notes = values.notes.trim();
  const terms = values.terms.trim();
  const internalNotes = values.internal_notes.trim();
  return {
    contact_id: values.contact_id,
    ...(title ? { title } : {}),
    ...(values.issue_date ? { issue_date: values.issue_date } : {}),
    ...(values.valid_until ? { valid_until: values.valid_until } : {}),
    ...(notes ? { notes } : {}),
    // Omitted = the backend prefills from module settings; only send what's typed.
    ...(terms ? { terms } : {}),
    ...(internalNotes ? { internal_notes: internalNotes } : {}),
    ...depositPayload(values),
    items: toQuoteItemsPayload(values.items),
  };
}

/** PATCH counterpart — explicit nulls clear stored values. */
export function toUpdateQuotePayload(values: QuoteFormValues): UpdateQuotePayload {
  const deposit = depositPayload(values);
  return {
    contact_id: values.contact_id,
    title: values.title.trim() || null,
    issue_date: values.issue_date || null,
    valid_until: values.valid_until || null,
    notes: values.notes.trim() || null,
    terms: values.terms.trim() || null,
    internal_notes: values.internal_notes.trim() || null,
    deposit_type: deposit.deposit_type ?? null,
    deposit_value: deposit.deposit_value ?? null,
  };
}

export interface QuoteTotals {
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_cents: number;
}

/** Live footer preview — mirrors QuoteItemService::recompute exactly. */
export function computeQuoteTotals(
  items: QuoteItemFormValues[],
  taxRateBp: number,
  depositType: "none" | "percent" | "fixed",
  depositValue: string
): QuoteTotals {
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

  const total = subtotal + tax;

  let deposit = 0;
  if (depositType === "percent") {
    const percent = Number(depositValue);
    if (Number.isFinite(percent) && percent > 0) deposit = Math.round((total * percent) / 100);
  } else if (depositType === "fixed") {
    deposit = dollarsToCents(depositValue) ?? 0;
  }

  return { subtotal_cents: subtotal, tax_cents: tax, total_cents: total, deposit_cents: deposit };
}
