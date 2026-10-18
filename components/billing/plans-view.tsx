"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleHelpIcon,
  LogOutIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState } from "@/components/error-state";
import { Logo } from "@/components/logo";
import { useBusiness } from "@/components/business/business-provider";
import { CardCaptureDialog } from "@/components/billing/card-capture-dialog";
import { ChangePlanDialog } from "@/components/billing/change-plan-dialog";
import { SubscribeDialog } from "@/components/billing/subscribe-dialog";
import { useLogout } from "@/hooks/use-auth-mutations";
import { usePlans } from "@/hooks/use-plans";
import { useBilling } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { LOCALE, formatDate } from "@/lib/datetime";
import {
  BILLING_INTERVAL_LABELS,
  PLAN_ENTITLEMENT_DEFAULTS,
  SETUP_FEE_CENTS,
  SETUP_FEE_PROMO_CENTS,
  currentSetupFeeCents,
  setupFeePromoActive,
  setupFeePromoEndsAt,
  type BillingInterval,
  type Plan,
  type PlanEntitlements,
  type Subscription,
} from "@/lib/api/types";

/** The tenancy-style hero wash; blue rgba fades read on light and dark. */
const HERO_GRADIENT =
  "radial-gradient(ellipse at top center, rgba(37, 99, 235, 0.15) 0%, rgba(59, 130, 246, 0.1) 35%, rgba(56, 189, 248, 0.05) 70%, rgba(255, 255, 255, 0.02) 100%)";

const CONTACT_SALES_HREF = "mailto:info@answerai.co.il?subject=Custom%20plan%20enquiry";

const PLAN_DESCRIPTIONS: Record<string, string> = {
  starter: "Essential coverage for small businesses",
  growth: "Most popular for growing businesses",
  scale: "Advanced capacity for busy teams",
};

function planDescription(plan: Plan): string {
  if (!plan.is_public) return "Tailored specifically for your business";
  return PLAN_DESCRIPTIONS[plan.slug] ?? "Flexible plan for your business";
}

/** Label vs the current plan: cheaper schedules, dearer charges now. */
function effectiveMonthlyCents(plan: Plan, interval: BillingInterval): number {
  return interval === "monthly"
    ? plan.monthly_price_cents
    : Math.round(plan.annual_price_cents / 12);
}

/** The pricing block never drops ".00" — always two decimals. */
function formatCents2(cents: number): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function retentionLabel(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${days} days`;
}

type CardAction =
  | { kind: "current" }
  | { kind: "scheduled" }
  | { kind: "subscribe"; label: string }
  | { kind: "activate" }
  | { kind: "change"; label: string }
  | { kind: "none" };

function cardAction(
  plan: Plan,
  interval: BillingInterval,
  subscription: Subscription | null,
  privileged: boolean
): CardAction {
  if (!privileged) return { kind: "none" };

  if (!subscription || subscription.status === "cancelled") {
    return { kind: "subscribe", label: `Choose ${plan.name}` };
  }

  const isCurrent = subscription.plan?.id === plan.id && subscription.interval === interval;

  switch (subscription.status) {
    case "pending":
      // The chosen-but-unactivated plan just needs a card; anything else
      // re-runs subscribe, which repoints the pending row.
      return isCurrent
        ? { kind: "activate" }
        : { kind: "subscribe", label: `Switch to ${plan.name}` };
    case "suspended":
      // Plan changes need a billable subscription — payment first.
      return { kind: "none" };
    default: {
      if (isCurrent) return { kind: "current" };
      if (
        subscription.pending_plan?.id === plan.id &&
        (subscription.pending_interval ?? subscription.interval) === interval
      ) {
        return { kind: "scheduled" };
      }
      if (!subscription.plan) return { kind: "none" };
      const current = effectiveMonthlyCents(subscription.plan, subscription.interval);
      const target = effectiveMonthlyCents(plan, interval);
      const label =
        target > current
          ? `Upgrade to ${plan.name}`
          : target < current
            ? `Downgrade to ${plan.name}`
            : plan.id === subscription.plan.id
              ? `Switch to ${BILLING_INTERVAL_LABELS[interval].toLowerCase()} billing`
              : `Switch to ${plan.name}`;
      return { kind: "change", label };
    }
  }
}

/* ----------------------------- Feature matrix ----------------------------- */

interface FeatureRow {
  label: string;
  tooltip: string;
  /** One entry per plan, aligned with the plans array. */
  values: (string | boolean)[];
  /** Value shown in the "Custom" teaser column (businesses without a pinned custom plan). */
  custom: string | boolean;
}

interface FeatureCategory {
  name: string;
  rows: FeatureRow[];
}

function buildFeatureCategories(plans: Plan[]): FeatureCategory[] {
  const entitlements: Required<PlanEntitlements>[] = plans.map((p) => ({
    ...PLAN_ENTITLEMENT_DEFAULTS,
    ...p.entitlements,
  }));

  // Rows every plan includes render as green checks across the board — the
  // table doubles as the feature list, so the baseline offering shows too.
  const everyPlan = plans.map(() => true);

  return [
    {
      name: "Included usage",
      rows: [
        {
          label: "Inbound AI minutes",
          tooltip:
            "AI-answered inbound call minutes included every month. Overage rates apply beyond this allowance.",
          values: entitlements.map((e) => `${e.inbound_minutes_included.toLocaleString()} / month`),
          custom: "Custom",
        },
        {
          label: "Inbound overage",
          tooltip: "Per-minute rate for inbound AI minutes beyond the monthly allowance.",
          values: entitlements.map((e) => `${formatCents(e.inbound_overage_cents_per_min)} / min`),
          custom: "Custom",
        },
        {
          label: "Outbound calls (PAYG)",
          tooltip:
            "Per-minute rate for AI outbound calls. Pay as you go — billed monthly for what you use, no allowance to buy.",
          values: entitlements.map((e) => `${formatCents(e.outbound_cents_per_min)} / min`),
          custom: "Custom",
        },
        {
          label: "Transfer minutes",
          tooltip: "Minutes of calls transferred to your team included every month.",
          values: entitlements.map((e) => `${e.transfer_pool_minutes.toLocaleString()} / month`),
          custom: "Custom",
        },
        {
          label: "Transfer overage",
          tooltip: "Per-minute rate for transferred minutes beyond the monthly pool.",
          values: entitlements.map((e) => `${formatCents(e.transfer_overage_cents_per_min)} / min`),
          custom: "Custom",
        },
      ],
    },
    {
      name: "Capacity",
      rows: [
        {
          label: "AI agents",
          tooltip: "How many AI receptionists you can run, each with its own number, script and hours.",
          values: entitlements.map((e) => String(e.max_agents)),
          custom: "Custom",
        },
        {
          label: "Phone numbers included",
          tooltip: "Dedicated phone numbers included with the plan.",
          values: entitlements.map((e) => String(e.included_numbers)),
          custom: "Custom",
        },
        {
          label: "Extra phone numbers",
          tooltip: "Monthly price for each additional number beyond those included.",
          values: entitlements.map((e) => `${formatCents(e.additional_number_cents)} / month`),
          custom: "Custom",
        },
        {
          label: "Team seats",
          tooltip: "Team member accounts that can access this business.",
          values: entitlements.map((e) => String(e.max_seats)),
          custom: "Custom",
        },
      ],
    },
    {
      name: "Features",
      rows: [
        {
          label: "24/7 AI call answering",
          tooltip:
            "Your AI receptionist answers every inbound call around the clock — no missed calls, no voicemail.",
          values: everyPlan,
          custom: true,
        },
        {
          label: "Call recordings & transcripts",
          tooltip: "Every call is recorded and transcribed so you can review conversations any time.",
          values: everyPlan,
          custom: true,
        },
        {
          label: "Appointment booking",
          tooltip: "The AI books appointments straight into your calendar during the call.",
          values: everyPlan,
          custom: true,
        },
        {
          label: "Lead capture",
          tooltip: "Caller details and enquiries are captured automatically as leads.",
          values: everyPlan,
          custom: true,
        },
        {
          label: "Quotes, jobs & invoices",
          tooltip: "Turn calls into quotes, jobs and invoices without re-typing details.",
          values: everyPlan,
          custom: true,
        },
        {
          label: "Screened transfers",
          tooltip:
            "The AI announces the caller and reason first, so your team can accept or decline before being connected.",
          values: entitlements.map((e) => e.screened_transfers),
          custom: "Custom",
        },
        {
          label: "AI data extraction",
          tooltip:
            "Automatically pulls structured details — contact info, job requests, quote details — out of every call.",
          values: entitlements.map((e) => e.ai_extraction),
          custom: "Custom",
        },
        {
          label: "Recording retention",
          tooltip: "How long call recordings are kept before automatic deletion.",
          values: entitlements.map((e) => retentionLabel(e.recording_retention_days)),
          custom: "Custom",
        },
      ],
    },
  ];
}

/* ----------------------------- Building blocks ---------------------------- */

function FeatureLabel({
  label,
  tooltip,
  desktop = false,
}: {
  label: string;
  tooltip: string;
  desktop?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="flex cursor-default items-center gap-1.5 text-left">
        <span
          className={
            desktop ? "text-sm font-medium text-foreground" : "text-xs text-muted-foreground sm:text-sm"
          }
        >
          {label}
        </span>
        <CircleHelpIcon
          className={cn("shrink-0 text-muted-foreground/70", desktop ? "size-4" : "size-3.5")}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function FeatureValue({
  value,
  emphasized = false,
}: {
  value: string | boolean;
  emphasized?: boolean;
}) {
  if (value === true) {
    return (
      <div className="flex size-6 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckIcon className="size-4" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex size-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XIcon className="size-4" />
      </div>
    );
  }
  return (
    <span className={cn("text-sm font-medium", emphasized ? "text-foreground" : "text-muted-foreground")}>
      {value}
    </span>
  );
}

/** Big price with shekels/agorot split, strikethrough monthly when annual. */
function PriceBlock({ plan, interval }: { plan: Plan; interval: BillingInterval }) {
  const perMonthCents = effectiveMonthlyCents(plan, interval);
  const shekels = Math.floor(perMonthCents / 100);
  const cents = perMonthCents % 100;

  return (
    <div>
      {interval === "annual" && (
        <div className="text-sm text-muted-foreground line-through">
          {formatCents2(plan.monthly_price_cents)}
        </div>
      )}
      <div className="font-heading text-3xl font-semibold text-foreground">
        ₪{shekels.toLocaleString("en-IL")}
        <span className="text-sm">.{String(cents).padStart(2, "0")}</span>
      </div>
      <div className="text-sm text-muted-foreground">/month</div>
      {interval === "annual" && (
        <div className="mt-1 text-xs text-muted-foreground">
          ({formatCents2(plan.annual_price_cents)}/year)
        </div>
      )}
    </div>
  );
}

function PlanCta({
  plan,
  action,
  framed,
  onSubscribe,
  onChange,
  onActivate,
}: {
  plan: Plan;
  action: CardAction;
  framed: boolean;
  onSubscribe: () => void;
  onChange: () => void;
  onActivate: () => void;
}) {
  const isCustom = !plan.is_public;
  // Custom plans carry the cyan CTA accent; the framed column gets the
  // primary fill; everything else stays quiet.
  const activeVariant = isCustom ? "cta" : framed ? "default" : "outline";

  switch (action.kind) {
    case "current":
      // Owner-specified grayed brand blue for the locked current plan.
      return (
        <Button className="w-full bg-[#0057a8] text-white" disabled>
          Current plan
        </Button>
      );
    case "scheduled":
      return (
        <Button className="w-full" variant="outline" disabled>
          Scheduled
        </Button>
      );
    case "activate":
      return (
        <Button className="w-full" variant={isCustom ? "cta" : "default"} onClick={onActivate}>
          Add card &amp; activate
        </Button>
      );
    case "subscribe":
      return (
        <Button className="w-full" variant={activeVariant} onClick={onSubscribe}>
          {action.label}
        </Button>
      );
    case "change":
      return (
        <Button className="w-full" variant={activeVariant} onClick={onChange}>
          {action.label}
        </Button>
      );
    case "none":
      return (
        <Button className="w-full" variant="outline" disabled>
          {plan.is_public ? plan.name : "Custom"}
        </Button>
      );
  }
}

/** Gradient page wrapper with the logo / back / sign-out header row. */
function PageFrame({
  backHref,
  children,
}: {
  backHref: string | null;
  children: React.ReactNode;
}) {
  const logout = useLogout();

  return (
    <div className="relative min-h-screen" style={{ background: HERO_GRADIENT }}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo className="h-16" />
          <div className="flex items-center gap-2">
            {backHref && (
              <Button variant="cta" render={<Link href={backHref} />}>
                <ArrowLeftIcon />
                Back to billing
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? <Spinner /> : <LogOutIcon />}
              {logout.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export function PlansView() {
  const { business, membership } = useBusiness();
  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";
  const router = useRouter();

  const plansQuery = usePlans(business.id);
  const billingQuery = useBilling(business.id);

  const [intervalChoice, setIntervalChoice] = useState<BillingInterval | null>(null);
  const [subscribeTarget, setSubscribeTarget] = useState<Plan | null>(null);
  const [changeTarget, setChangeTarget] = useState<Plan | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

  const subscription = billingQuery.data?.subscription ?? null;
  const setupFeePaid = billingQuery.data?.setup_fee_paid ?? false;
  const billingHref = `/b/${business.id}/settings/billing`;

  // Until the user touches the toggle it tracks the live subscription's
  // interval, so the current plan reads as current on arrival.
  const interval: BillingInterval =
    intervalChoice ??
    (subscription && subscription.status !== "cancelled" ? subscription.interval : "monthly");

  if (plansQuery.isPending || billingQuery.isPending) {
    return (
      <PageFrame backHref={null}>
        <div className="relative z-10 flex flex-col items-center gap-8 px-4 pt-14 pb-10 sm:px-6 lg:px-8">
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-13 w-full max-w-md rounded-full" />
          <div className="w-full max-w-7xl">
            <Skeleton className="hidden h-[640px] w-full rounded-lg xl:block" />
            <div className="space-y-6 xl:hidden">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (plansQuery.isError || billingQuery.isError) {
    const failed = plansQuery.isError ? plansQuery : billingQuery;
    return (
      <PageFrame backHref={null}>
        <div className="relative z-10 flex justify-center px-6 pt-14">
          <ErrorState
            title="Couldn't load plans"
            message={failed.error?.message ?? ""}
            onRetry={() => {
              void plansQuery.refetch();
              void billingQuery.refetch();
            }}
          />
        </div>
      </PageFrame>
    );
  }

  const plans = plansQuery.data;
  const status = subscription?.status ?? null;
  const isNewSubscriber = !subscription || status === "cancelled";
  // Composed into the initial charge for any business that hasn't paid it —
  // pending subs included (their charge only runs once a card is added).
  const setupFeeDue = !setupFeePaid && (isNewSubscriber || status === "pending");
  const customPlan = plans.find((p) => !p.is_public);
  const currentPlanId = !isNewSubscriber ? (subscription?.plan?.id ?? null) : null;
  // The framed column: the subscribed plan when there is one; otherwise the
  // custom plan pinned to this business, falling back to Growth.
  const highlightId =
    currentPlanId ??
    (isNewSubscriber
      ? (customPlan?.id ?? plans.find((p) => p.slug === "growth")?.id ?? null)
      : null);

  // No pinned custom plan → advertise one with a static "Contact Sales"
  // column, tenancy-style. A real custom plan renders as a live column.
  const showCustomTeaser = !customPlan;

  const categories = buildFeatureCategories(plans);
  const columnCount = plans.length + 1 + (showCustomTeaser ? 1 : 0);
  const gridStyle = { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };

  const ribbonFor = (plan: Plan): string | null => {
    if (plan.id === currentPlanId) return "Current plan";
    if (!plan.is_public) return "Custom";
    if (plan.id === highlightId && isNewSubscriber) return "Most Popular";
    return null;
  };

  const frameClass = (plan: Plan) => (!plan.is_public ? "border-cta" : "border-primary");
  const ribbonClass = (plan: Plan) =>
    !plan.is_public ? "bg-cta text-cta-foreground" : "bg-primary text-primary-foreground";

  const ctaFor = (plan: Plan) => (
    <PlanCta
      plan={plan}
      action={cardAction(plan, interval, subscription, privileged)}
      framed={plan.id === highlightId}
      onSubscribe={() => setSubscribeTarget(plan)}
      onChange={() => setChangeTarget(plan)}
      onActivate={() => setCardOpen(true)}
    />
  );

  // The promo's end date, for the "ends 31 March" copy; null when no promo runs.
  const promoEndsAt = setupFeePromoEndsAt();
  const promoEndsLabel = promoEndsAt?.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
  });

  const hasAlerts =
    status === "suspended" ||
    status === "past_due" ||
    (status === "pending" && privileged) ||
    (subscription?.cancel_at_period_end && status !== "cancelled") ||
    !!subscription?.pending_plan ||
    !privileged;

  return (
    <PageFrame backHref={subscription ? billingHref : null}>
      {/* Hero */}
      <div className="relative z-10 px-6 pt-10 sm:pt-14">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 font-heading text-3xl leading-tight font-semibold text-foreground sm:text-4xl lg:text-5xl">
            Choose the right plan
            <br />
            for your business
          </h1>
          <p className="mx-auto mb-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Choose the perfect plan that fits your needs—whether you&apos;re a small business or
            a large established corporation.
          </p>
        </div>
      </div>

      {/* Billing interval toggle */}
      <div className="relative z-10 w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="flex w-full max-w-md items-center rounded-full border border-border bg-card p-1">
            {(["monthly", "annual"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIntervalChoice(option)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200",
                  interval === option
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                    : "cursor-pointer text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {BILLING_INTERVAL_LABELS[option]}
                {option === "annual" && (
                  <Badge
                    variant="success"
                    className={cn(interval === "annual" && "bg-white/20 text-white dark:text-white")}
                  >
                    Save 10%
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">All prices are in ILS (₪), excluding VAT.</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Annual plans pay the year up front; usage charges still bill monthly.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Upgrades apply immediately with credit for unused time; downgrades take effect at the
            end of the current period.
          </p>
          {setupFeeDue && setupFeePromoActive() && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-foreground">
              <Badge variant="success">Limited offer</Badge>
              <span>
                One-time setup &amp; onboarding fee{" "}
                <s className="text-muted-foreground">{formatCents(SETUP_FEE_CENTS)}</s>{" "}
                <span className="font-semibold">{formatCents(SETUP_FEE_PROMO_CENTS)}</span> + VAT
                {promoEndsLabel && ` — ends ${promoEndsLabel}`}
              </span>
            </div>
          )}
          {setupFeeDue && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              First subscriptions include a one-time {formatCents(currentSetupFeeCents())} + VAT
              setup &amp; onboarding fee — never charged again, including on plan changes.
            </p>
          )}
        </div>
      </div>

      {/* Subscription status alerts */}
      {hasAlerts && (
        <div className="relative z-10 w-full px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {status === "suspended" && (
              <Alert variant="destructive">
                <AlertTitle>Your subscription is suspended</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>
                    A payment failed and service is paused. Update your card to retry the charge and
                    restore service — plan changes come after that.
                  </span>
                  <Button size="sm" variant="destructive" render={<Link href={billingHref} />}>
                    Fix payment
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {status === "past_due" && (
              <Alert variant="warning">
                <AlertTitle>Your last payment failed</AlertTitle>
                <AlertDescription>
                  We&apos;ll retry automatically, or{" "}
                  <Link className="underline underline-offset-4" href={billingHref}>
                    update your card
                  </Link>{" "}
                  to retry now. You can still change plans in the meantime.
                </AlertDescription>
              </Alert>
            )}
            {status === "pending" && privileged && (
              <Alert variant="info">
                <AlertTitle>Almost there — add a card to activate</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>
                    {subscription?.plan
                      ? `${subscription.plan.name} (${BILLING_INTERVAL_LABELS[subscription.interval].toLowerCase()}) is reserved for you. Your subscription starts once a card is added.`
                      : "Your subscription starts once a card is added."}
                  </span>
                  <Button size="sm" onClick={() => setCardOpen(true)}>
                    Add card
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {subscription?.cancel_at_period_end && status !== "cancelled" && (
              <Alert variant="warning">
                <AlertTitle>Cancellation scheduled</AlertTitle>
                <AlertDescription>
                  Your subscription ends on{" "}
                  {subscription.current_period_end
                    ? formatDate(subscription.current_period_end, business.timezone)
                    : "the current period's end"}
                  . You can resume it from the{" "}
                  <Link className="underline underline-offset-4" href={billingHref}>
                    billing page
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}
            {subscription?.pending_plan && (
              <Alert variant="info">
                <AlertTitle>Plan change scheduled</AlertTitle>
                <AlertDescription>
                  Your plan changes to {subscription.pending_plan.name} (
                  {BILLING_INTERVAL_LABELS[
                    subscription.pending_interval ?? subscription.interval
                  ].toLowerCase()}
                  ) on{" "}
                  {subscription.current_period_end
                    ? formatDate(subscription.current_period_end, business.timezone)
                    : "the next renewal"}
                  . Choosing a different plan below replaces this change.
                </AlertDescription>
              </Alert>
            )}
            {!privileged && (
              <Alert>
                <AlertTitle>View only</AlertTitle>
                <AlertDescription>
                  Subscriptions are managed by the business owner and admins.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="relative z-10 w-full px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Mobile / tablet — stacked cards */}
          <div className="space-y-4 sm:space-y-6 xl:hidden">
            {plans.map((plan, planIndex) => {
              const framed = plan.id === highlightId;
              const isCustom = !plan.is_public;
              const ribbon = ribbonFor(plan);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-lg border bg-card p-4 sm:p-6",
                    framed ? frameClass(plan) : "border-border",
                    !framed && isCustom && "border-cta"
                  )}
                >
                  <div className="text-center">
                    {ribbon && (
                      <div
                        className={cn(
                          "mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium",
                          ribbonClass(plan)
                        )}
                      >
                        {ribbon}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-foreground sm:text-xl">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{planDescription(plan)}</p>
                    <div className="mt-4">
                      <PriceBlock plan={plan} interval={interval} />
                    </div>
                    <div className="mt-4">{ctaFor(plan)}</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {categories.map((category) => (
                      <div key={category.name}>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">
                          {category.name}
                        </h4>
                        <div className="space-y-2">
                          {category.rows.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between gap-3"
                            >
                              <FeatureLabel label={row.label} tooltip={row.tooltip} />
                              <div className="shrink-0">
                                <FeatureValue value={row.values[planIndex]} emphasized={framed} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {showCustomTeaser && (
              <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">Custom</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tailored solution for your needs
                  </p>
                  <div className="mt-4">
                    <div className="font-heading text-3xl font-semibold text-foreground">
                      Custom
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Contact us for pricing
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="w-full" variant="cta" render={<a href={CONTACT_SALES_HREF} />}>
                      Contact Sales
                    </Button>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {categories.map((category) => (
                    <div key={category.name}>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        {category.name}
                      </h4>
                      <div className="space-y-2">
                        {category.rows.map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-3">
                            <FeatureLabel label={row.label} tooltip={row.tooltip} />
                            <div className="shrink-0">
                              <FeatureValue value={row.custom} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop — full comparison table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card xl:block">
            {/* Plan header row */}
            <div className="grid border-b border-border" style={gridStyle}>
              <div className="p-6" />
              {plans.map((plan) => {
                const framed = plan.id === highlightId;
                const ribbon = ribbonFor(plan);
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      // Flex column + bottom-pinned CTA: buttons stay level
                      // even when descriptions wrap to different line counts.
                      "relative flex flex-col p-6 text-center",
                      framed && cn("border-2", frameClass(plan))
                    )}
                  >
                    {ribbon && (
                      <div
                        className={cn(
                          "absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg px-3 py-1 text-xs font-medium whitespace-nowrap",
                          ribbonClass(plan)
                        )}
                      >
                        {ribbon}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                      {planDescription(plan)}
                    </p>
                    <div className="mt-4">
                      <PriceBlock plan={plan} interval={interval} />
                    </div>
                    <div className="mt-auto pt-4">{ctaFor(plan)}</div>
                  </div>
                );
              })}
              {showCustomTeaser && (
                <div className="relative flex flex-col p-6 text-center">
                  <h3 className="text-lg font-semibold text-foreground">Custom</h3>
                  <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                    Tailored solution for your needs
                  </p>
                  <div className="mt-4">
                    {/* Invisible placeholders keep the row aligned in annual mode. */}
                    {interval === "annual" && <div className="text-sm opacity-0">–</div>}
                    <div className="font-heading text-3xl font-semibold text-foreground">
                      Custom
                    </div>
                    <div className="text-sm text-muted-foreground">Contact us for pricing</div>
                    {interval === "annual" && <div className="mt-1 text-xs opacity-0">–</div>}
                  </div>
                  <div className="mt-auto pt-4">
                    <Button className="w-full" variant="cta" render={<a href={CONTACT_SALES_HREF} />}>
                      Contact Sales
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Feature categories */}
            {categories.map((category, categoryIndex) => {
              const isLastCategory = categoryIndex === categories.length - 1;
              return (
                <div key={category.name}>
                  <div className="bg-muted/50 px-6 py-4">
                    <h4 className="text-lg font-semibold text-foreground">{category.name}</h4>
                  </div>

                  {category.rows.map((row, rowIndex) => {
                    const isFirstRow = rowIndex === 0;
                    const isLastRow = rowIndex === category.rows.length - 1;
                    // The final row of the table closes against the outer
                    // border instead of drawing its own separator.
                    const rowBorder = !(isLastRow && isLastCategory) && "border-b border-border/60";

                    return (
                      <div key={row.label} className="grid" style={gridStyle}>
                        <div className={cn("flex items-center p-4", rowBorder)}>
                          <FeatureLabel label={row.label} tooltip={row.tooltip} desktop />
                        </div>

                        {plans.map((plan, planIndex) => {
                          const framed = plan.id === highlightId;
                          const value = row.values[planIndex];

                          if (framed) {
                            // Double wrapper: the outer div carries the
                            // column frame, the inner keeps the row rhythm.
                            return (
                              <div
                                key={plan.id}
                                className={cn(
                                  "border-x-2",
                                  frameClass(plan),
                                  isFirstRow && "border-t-2",
                                  isLastRow && "border-b-2"
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex h-full items-center justify-center p-4",
                                    rowBorder
                                  )}
                                >
                                  <FeatureValue value={value} emphasized />
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={plan.id}
                              className={cn(
                                "flex items-center justify-center p-4",
                                (planIndex < plans.length - 1 || showCustomTeaser) &&
                                  "border-r border-border/60",
                                rowBorder
                              )}
                            >
                              <FeatureValue value={value} />
                            </div>
                          );
                        })}
                        {showCustomTeaser && (
                          <div className={cn("flex items-center justify-center p-4", rowBorder)}>
                            <FeatureValue value={row.custom} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SubscribeDialog
        businessUuid={business.id}
        plan={subscribeTarget}
        interval={interval}
        setupFeeDue={!setupFeePaid}
        onOpenChange={(open) => {
          if (!open) setSubscribeTarget(null);
        }}
        onSubscribed={() => {
          setSubscribeTarget(null);
          // Chained modals: let the subscribe dialog's closing interaction
          // settle first, or its final pointer event dismisses the new one.
          window.setTimeout(() => setCardOpen(true), 200);
        }}
      />

      <ChangePlanDialog
        businessUuid={business.id}
        plan={changeTarget}
        interval={interval}
        timezone={business.timezone}
        onOpenChange={(open) => {
          if (!open) setChangeTarget(null);
        }}
      />

      <CardCaptureDialog
        businessUuid={business.id}
        open={cardOpen}
        onOpenChange={setCardOpen}
        intent="activate"
        onSuccess={() => router.push(billingHref)}
      />
    </PageFrame>
  );
}
