/**
 * Mirrors app/Http/Resources/{Plan,Subscription,BillingCharge}Resource.php,
 * the GET /billing aggregate and POST /billing/change-plan/preview shapes.
 */

export const SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending: "Pending",
  active: "Active",
  past_due: "Past due",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

export const BILLING_CHARGE_STATUSES = ["pending", "paid", "failed"] as const;
export type BillingChargeStatus = (typeof BILLING_CHARGE_STATUSES)[number];

export const BILLING_CHARGE_STATUS_LABELS: Record<BillingChargeStatus, string> = {
  pending: "Processing",
  paid: "Paid",
  failed: "Failed",
};

export const BILLING_CHARGE_TYPES = ["initial", "renewal", "plan_change"] as const;
export type BillingChargeType = (typeof BILLING_CHARGE_TYPES)[number];

export const BILLING_CHARGE_TYPE_LABELS: Record<BillingChargeType, string> = {
  initial: "First charge",
  renewal: "Renewal",
  plan_change: "Plan change",
};

/**
 * The plan's entitlements JSON. Every key is optional: custom plan rows may
 * carry a partial set — the backend resolves missing keys over Starter-shaped
 * defaults (Entitlements::for), mirrored here by PLAN_ENTITLEMENT_DEFAULTS.
 */
export interface PlanEntitlements {
  inbound_minutes_included?: number;
  inbound_overage_cents_per_min?: number;
  outbound_cents_per_min?: number;
  transfer_pool_minutes?: number;
  transfer_overage_cents_per_min?: number;
  max_agents?: number;
  included_numbers?: number;
  additional_number_cents?: number;
  max_seats?: number;
  screened_transfers?: boolean;
  ai_extraction?: boolean;
  recording_retention_days?: number;
}

/** Keep in step with Entitlements::DEFAULTS on the backend. */
export const PLAN_ENTITLEMENT_DEFAULTS: Required<PlanEntitlements> = {
  inbound_minutes_included: 500,
  inbound_overage_cents_per_min: 40,
  outbound_cents_per_min: 50,
  transfer_pool_minutes: 500,
  transfer_overage_cents_per_min: 15,
  max_agents: 1,
  included_numbers: 1,
  additional_number_cents: 2000,
  max_seats: 10,
  screened_transfers: false,
  ai_extraction: false,
  recording_retention_days: 90,
};

/**
 * Display-only mirror of config('billing.setup_fee_cents') — the one-time
 * setup fee (₪1,100 ex VAT) first-time subscribers must see before committing.
 * The backend composes the real charge; this never feeds a computation it owns.
 */
export const SETUP_FEE_CENTS = 110000;

/**
 * Display-only mirror of config('billing.setup_fee_promo') — the limited-time
 * discounted setup fee and the instant the promo ends. Keep in lockstep with
 * the backend config, or previews will disagree with the composed charge. An
 * empty ENDS_AT means no promo runs — the backend's default.
 */
export const SETUP_FEE_PROMO_CENTS = 55000;
export const SETUP_FEE_PROMO_ENDS_AT: string = "";

/** The instant the setup fee promo ends, or null when no promo is configured. */
export function setupFeePromoEndsAt(): Date | null {
  if (SETUP_FEE_PROMO_ENDS_AT === "") return null;
  const ms = Date.parse(SETUP_FEE_PROMO_ENDS_AT);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** True while the setup fee promo runs — mirrors SetupFee::promoActive(). */
export function setupFeePromoActive(now: Date = new Date()): boolean {
  const endsAt = setupFeePromoEndsAt();
  return endsAt !== null && now.getTime() <= endsAt.getTime();
}

/** The setup fee to preview right now — mirrors SetupFee::currentCents(). */
export function currentSetupFeeCents(now: Date = new Date()): number {
  return setupFeePromoActive(now) ? SETUP_FEE_PROMO_CENTS : SETUP_FEE_CENTS;
}

/** VAT in basis points (18%), for preview figures the backend hasn't priced. */
export const TAX_BP = 1800;

/** The tax line label on every breakdown — "VAT (18%)", derived from TAX_BP. */
export const TAX_LINE_LABEL = `VAT (${TAX_BP / 100}%)`;

export interface Plan {
  id: string;
  name: string;
  slug: string;
  /** false = custom plan pinned to this business. */
  is_public: boolean;
  monthly_price_cents: number;
  /** Already discounted (10% off 12 × monthly) — display, never derive. */
  annual_price_cents: number;
  currency: string;
  entitlements: PlanEntitlements;
}

export interface PendingPlanRef {
  id: string;
  name: string;
  slug: string;
}

export interface SubscriptionPaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  current_period_start: string | null;
  current_period_end: string | null;
  /** End of the paid plan-fee window (differs from period end on annual). */
  plan_paid_until: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  suspended_at: string | null;
  pending_interval: BillingInterval | null;
  /** Scheduled downgrade/interval switch — applies at the period roll. */
  pending_plan?: PendingPlanRef | null;
  /** Banked upgrade credit, consumed as a negative line on future charges. */
  credit_balance_cents: number;
  has_payment_method: boolean;
  payment_method: SubscriptionPaymentMethod | null;
  plan?: Plan;
  created_at: string;
  updated_at: string;
}

export const BILLING_LINE_KINDS = [
  "plan_fee",
  "setup_fee",
  "proration_credit",
  "credit_applied",
  "inbound_overage",
  "outbound_usage",
  "transfer_overage",
  "extra_numbers",
] as const;
export type BillingLineKind = (typeof BILLING_LINE_KINDS)[number];

export interface BillingChargeLineItem {
  kind: BillingLineKind;
  description: string;
  quantity: number;
  unit_cents: number;
  /** Signed — proration/applied credit lines are negative. */
  amount_cents: number;
  tax_cents: number;
}

export interface BillingCharge {
  id: string;
  type: BillingChargeType;
  status: BillingChargeStatus;
  period_start: string | null;
  period_end: string | null;
  line_items: BillingChargeLineItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  /** Gateway's on-charged card fee — shown as "card surcharge" when present. */
  gateway_fee_cents: number | null;
  currency: string;
  receipt_number: string | null;
  failure_reason: string | null;
  next_retry_at: string | null;
  paid_at: string | null;
  created_at: string;
}

/** UsageService::snapshot — current period usage, UTC bounds. */
export interface UsageSnapshot {
  period_start: string;
  period_end: string;
  inbound_minutes_used: number;
  inbound_minutes_included: number;
  inbound_overage_minutes: number;
  outbound_minutes: number;
  transfer_minutes_used: number;
  transfer_pool_minutes: number;
  transfer_overage_minutes: number;
  extra_numbers: number;
}

/** GET /billing — everything the billing page needs in one read. */
export interface BillingAggregate {
  subscription: Subscription | null;
  /** null until the subscription has an open period (e.g. still pending). */
  usage: UsageSnapshot | null;
  setup_fee_paid: boolean;
  recent_charges: BillingCharge[];
}

/** Body of subscribe, change-plan and change-plan/preview. */
export interface PlanChangePayload {
  plan: string;
  interval: BillingInterval;
}

export interface ChangePlanPreviewImmediate {
  immediate: true;
  line_items: BillingChargeLineItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  /** Unused prepaid time beyond this charge — banked, never refunded. */
  credit_banked_cents: number;
}

export interface ChangePlanPreviewScheduled {
  immediate: false;
  effective_at: string | null;
}

export type ChangePlanPreview = ChangePlanPreviewImmediate | ChangePlanPreviewScheduled;

/**
 * POST /billing/setup-session — card-capture session. Stripe returns a
 * SetupIntent (session_id = seti_…) whose client_secret the frontend mounts
 * the Payment Element with; the fake dev gateway returns only session_id +
 * url (the frontend short-circuits with a fabricated token).
 */
export interface BillingSetupSession {
  session_id: string;
  url?: string;
  provider?: "stripe";
  mode?: "elements";
  client_secret?: string;
  publishable_key?: string;
}
