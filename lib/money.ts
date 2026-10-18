import { isUnitPriced, type DurationUnit, type PriceType } from "@/lib/api/types";

/**
 * Money is integer agorot everywhere in the API; inputs and summaries deal
 * in shekels. Lenient parse: "₪1,200.50" → 120050, "" / junk → null.
 */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[₪$,\s]/g, "");
  if (cleaned === "" || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Cents → what the input should display ("180" or "180.50", "" for null). */
export function centsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/**
 * en-IL, not he-IL: the Hebrew locale wraps the symbol and digits in bidi
 * marks, which breaks the PriceBlock's whole/decimal split and tabular columns.
 */
export function formatCents(cents: number, currency = "ILS"): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const UNIT_SUFFIX: Partial<Record<PriceType, string>> = {
  hourly: "/hour",
  daily: "/day",
  weekly: "/week",
  monthly: "/month",
  yearly: "/year",
};

export function priceSummary(item: {
  has_price: boolean;
  price_type: PriceType | null;
  price_cents: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
}): string {
  if (!item.has_price || !item.price_type) return "No price";
  if (item.price_type === "custom_message") return "Custom message";
  if (item.price_type === "range") {
    if (item.price_min_cents === null || item.price_max_cents === null) return "Price not set";
    return `${formatCents(item.price_min_cents)}–${formatCents(item.price_max_cents)}`;
  }
  if (isUnitPriced(item.price_type)) {
    if (item.price_cents === null) return "Price not set";
    return `${formatCents(item.price_cents)}${UNIT_SUFFIX[item.price_type] ?? ""}`;
  }
  return "Price not set";
}

/** priceSummary over a Partial payload (extraction drafts). */
export function payloadPriceSummary(p: {
  has_price?: boolean;
  price_type?: PriceType | null;
  price_cents?: number | null;
  price_min_cents?: number | null;
  price_max_cents?: number | null;
}): string {
  return priceSummary({
    has_price: p.has_price ?? false,
    price_type: p.price_type ?? null,
    price_cents: p.price_cents ?? null,
    price_min_cents: p.price_min_cents ?? null,
    price_max_cents: p.price_max_cents ?? null,
  });
}

const DURATION_LABELS: Record<DurationUnit, [string, string]> = {
  hours: ["hr", "hrs"],
  days: ["day", "days"],
  weeks: ["wk", "wks"],
  months: ["mth", "mths"],
  years: ["yr", "yrs"],
};

export function durationSummary(item: {
  has_duration: boolean;
  duration_unit: DurationUnit | null;
  duration_quantity: number | null;
}): string | null {
  if (!item.has_duration || !item.duration_unit || item.duration_quantity === null) return null;
  const quantity = item.duration_quantity;
  const [singular, plural] = DURATION_LABELS[item.duration_unit];
  return `${quantity} ${quantity === 1 ? singular : plural}`;
}
