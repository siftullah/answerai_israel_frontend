import { isUnitPriced, type DurationUnit, type PriceType } from "@/lib/api/types";
import { rt } from "@/lib/i18n/runtime";

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

/** Per-unit price wording ("₪180/hour"); `fixed` renders the bare amount. */
const UNIT_PRICE: Partial<Record<PriceType, (price: string) => string>> = {
  hourly: (price) => rt("lib.money.perHour", { price }),
  daily: (price) => rt("lib.money.perDay", { price }),
  weekly: (price) => rt("lib.money.perWeek", { price }),
  monthly: (price) => rt("lib.money.perMonth", { price }),
  yearly: (price) => rt("lib.money.perYear", { price }),
};

export function priceSummary(item: {
  has_price: boolean;
  price_type: PriceType | null;
  price_cents: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
}): string {
  if (!item.has_price || !item.price_type) return rt("lib.money.noPrice");
  if (item.price_type === "custom_message") return rt("lib.money.customMessage");
  if (item.price_type === "range") {
    if (item.price_min_cents === null || item.price_max_cents === null) {
      return rt("lib.money.priceNotSet");
    }
    return `${formatCents(item.price_min_cents)}–${formatCents(item.price_max_cents)}`;
  }
  if (isUnitPriced(item.price_type)) {
    if (item.price_cents === null) return rt("lib.money.priceNotSet");
    const price = formatCents(item.price_cents);
    return UNIT_PRICE[item.price_type]?.(price) ?? price;
  }
  return rt("lib.money.priceNotSet");
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

/** "1 hr" / "3 hrs" — ICU plurals, so each language picks its own forms. */
const DURATION_LABELS: Record<DurationUnit, (count: number) => string> = {
  hours: (count) => rt("lib.money.duration.hours", { count }),
  days: (count) => rt("lib.money.duration.days", { count }),
  weeks: (count) => rt("lib.money.duration.weeks", { count }),
  months: (count) => rt("lib.money.duration.months", { count }),
  years: (count) => rt("lib.money.duration.years", { count }),
};

export function durationSummary(item: {
  has_duration: boolean;
  duration_unit: DurationUnit | null;
  duration_quantity: number | null;
}): string | null {
  if (!item.has_duration || !item.duration_unit || item.duration_quantity === null) return null;
  return DURATION_LABELS[item.duration_unit](item.duration_quantity);
}
