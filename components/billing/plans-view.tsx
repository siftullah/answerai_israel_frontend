"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { LanguagePicker } from "@/components/language-picker";
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
import { formatDate } from "@/lib/datetime";
import { displayLocale } from "@/lib/i18n/runtime";
import type { Translator } from "@/lib/i18n/types";
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

function planDescription(plan: Plan, t: Translator): string {
  if (!plan.is_public) return t("descriptions.custom");
  switch (plan.slug) {
    case "starter":
      return t("descriptions.starter");
    case "growth":
      return t("descriptions.growth");
    case "scale":
      return t("descriptions.scale");
    default:
      return t("descriptions.fallback");
  }
}

/** Label vs the current plan: cheaper schedules, dearer charges now. */
function effectiveMonthlyCents(plan: Plan, interval: BillingInterval): number {
  return interval === "monthly"
    ? plan.monthly_price_cents
    : Math.round(plan.annual_price_cents / 12);
}

/**
 * The pricing block never drops ".00" — always two decimals. "en-IL" in every
 * UI language on purpose, like lib/money's formatCents: he-IL wraps ₪ and the
 * digits in bidi marks.
 */
function formatCents2(cents: number): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function retentionLabel(days: number, t: Translator): string {
  if (days % 365 === 0) return t("values.years", { count: days / 365 });
  return t("values.days", { count: days });
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
  privileged: boolean,
  t: Translator
): CardAction {
  if (!privileged) return { kind: "none" };

  if (!subscription || subscription.status === "cancelled") {
    return { kind: "subscribe", label: t("cta.choose", { plan: plan.name }) };
  }

  const isCurrent = subscription.plan?.id === plan.id && subscription.interval === interval;

  switch (subscription.status) {
    case "pending":
      // The chosen-but-unactivated plan just needs a card; anything else
      // re-runs subscribe, which repoints the pending row.
      return isCurrent
        ? { kind: "activate" }
        : { kind: "subscribe", label: t("cta.switchPlan", { plan: plan.name }) };
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
          ? t("cta.upgrade", { plan: plan.name })
          : target < current
            ? t("cta.downgrade", { plan: plan.name })
            : plan.id === subscription.plan.id
              ? t("cta.switchInterval", { interval })
              : t("cta.switchPlan", { plan: plan.name });
      return { kind: "change", label };
    }
  }
}

/* ----------------------------- Feature matrix ----------------------------- */

interface FeatureRow {
  /** Stable React key — the label is translated. */
  id: string;
  label: string;
  tooltip: string;
  /** One entry per plan, aligned with the plans array. */
  values: (string | boolean)[];
  /** Value shown in the "Custom" teaser column (businesses without a pinned custom plan). */
  custom: string | boolean;
}

interface FeatureCategory {
  /** Stable React key — the name is translated. */
  id: string;
  name: string;
  rows: FeatureRow[];
}

function buildFeatureCategories(plans: Plan[], t: Translator): FeatureCategory[] {
  const entitlements: Required<PlanEntitlements>[] = plans.map((p) => ({
    ...PLAN_ENTITLEMENT_DEFAULTS,
    ...p.entitlements,
  }));

  // Rows every plan includes render as green checks across the board — the
  // table doubles as the feature list, so the baseline offering shows too.
  const everyPlan = plans.map(() => true);
  const custom = t("custom");
  const perMonth = (amount: string) => t("values.perMonth", { amount });
  const perMin = (amount: string) => t("values.perMin", { amount });
  const count = (n: number) => n.toLocaleString(displayLocale());

  return [
    {
      id: "usage",
      name: t("categories.usage"),
      rows: [
        {
          id: "inboundMinutes",
          label: t("features.inboundMinutes.label"),
          tooltip: t("features.inboundMinutes.tooltip"),
          values: entitlements.map((e) => perMonth(count(e.inbound_minutes_included))),
          custom,
        },
        {
          id: "inboundOverage",
          label: t("features.inboundOverage.label"),
          tooltip: t("features.inboundOverage.tooltip"),
          values: entitlements.map((e) => perMin(formatCents(e.inbound_overage_cents_per_min))),
          custom,
        },
        {
          id: "outbound",
          label: t("features.outbound.label"),
          tooltip: t("features.outbound.tooltip"),
          values: entitlements.map((e) => perMin(formatCents(e.outbound_cents_per_min))),
          custom,
        },
        {
          id: "transferMinutes",
          label: t("features.transferMinutes.label"),
          tooltip: t("features.transferMinutes.tooltip"),
          values: entitlements.map((e) => perMonth(count(e.transfer_pool_minutes))),
          custom,
        },
        {
          id: "transferOverage",
          label: t("features.transferOverage.label"),
          tooltip: t("features.transferOverage.tooltip"),
          values: entitlements.map((e) => perMin(formatCents(e.transfer_overage_cents_per_min))),
          custom,
        },
      ],
    },
    {
      id: "capacity",
      name: t("categories.capacity"),
      rows: [
        {
          id: "agents",
          label: t("features.agents.label"),
          tooltip: t("features.agents.tooltip"),
          values: entitlements.map((e) => count(e.max_agents)),
          custom,
        },
        {
          id: "includedNumbers",
          label: t("features.includedNumbers.label"),
          tooltip: t("features.includedNumbers.tooltip"),
          values: entitlements.map((e) => count(e.included_numbers)),
          custom,
        },
        {
          id: "extraNumbers",
          label: t("features.extraNumbers.label"),
          tooltip: t("features.extraNumbers.tooltip"),
          values: entitlements.map((e) => perMonth(formatCents(e.additional_number_cents))),
          custom,
        },
        {
          id: "seats",
          label: t("features.seats.label"),
          tooltip: t("features.seats.tooltip"),
          values: entitlements.map((e) => count(e.max_seats)),
          custom,
        },
      ],
    },
    {
      id: "features",
      name: t("categories.features"),
      rows: [
        {
          id: "answering",
          label: t("features.answering.label"),
          tooltip: t("features.answering.tooltip"),
          values: everyPlan,
          custom: true,
        },
        {
          id: "recordings",
          label: t("features.recordings.label"),
          tooltip: t("features.recordings.tooltip"),
          values: everyPlan,
          custom: true,
        },
        {
          id: "booking",
          label: t("features.booking.label"),
          tooltip: t("features.booking.tooltip"),
          values: everyPlan,
          custom: true,
        },
        {
          id: "leadCapture",
          label: t("features.leadCapture.label"),
          tooltip: t("features.leadCapture.tooltip"),
          values: everyPlan,
          custom: true,
        },
        {
          id: "quotesJobsInvoices",
          label: t("features.quotesJobsInvoices.label"),
          tooltip: t("features.quotesJobsInvoices.tooltip"),
          values: everyPlan,
          custom: true,
        },
        {
          id: "screenedTransfers",
          label: t("features.screenedTransfers.label"),
          tooltip: t("features.screenedTransfers.tooltip"),
          values: entitlements.map((e) => e.screened_transfers),
          custom,
        },
        {
          id: "extraction",
          label: t("features.extraction.label"),
          tooltip: t("features.extraction.tooltip"),
          values: entitlements.map((e) => e.ai_extraction),
          custom,
        },
        {
          id: "retention",
          label: t("features.retention.label"),
          tooltip: t("features.retention.tooltip"),
          values: entitlements.map((e) => retentionLabel(e.recording_retention_days, t)),
          custom,
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
      <TooltipTrigger className="flex cursor-default items-center gap-1.5 text-start">
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
  const t = useTranslations("billing.plans");
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
      {/* "en-IL" like formatCents2: Latin grouping, no bidi marks around ₪. */}
      <div className="font-heading text-3xl font-semibold text-foreground">
        ₪{shekels.toLocaleString("en-IL")}
        <span className="text-sm">.{String(cents).padStart(2, "0")}</span>
      </div>
      <div className="text-sm text-muted-foreground">{t("price.perMonth")}</div>
      {interval === "annual" && (
        <div className="mt-1 text-xs text-muted-foreground">
          {t("price.perYear", { amount: formatCents2(plan.annual_price_cents) })}
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
  const t = useTranslations("billing.plans");
  const isCustom = !plan.is_public;
  // Custom plans carry the cyan CTA accent; the framed column gets the
  // primary fill; everything else stays quiet.
  const activeVariant = isCustom ? "cta" : framed ? "default" : "outline";

  switch (action.kind) {
    case "current":
      // Owner-specified grayed brand blue for the locked current plan.
      return (
        <Button className="w-full bg-[#0057a8] text-white" disabled>
          {t("currentPlan")}
        </Button>
      );
    case "scheduled":
      return (
        <Button className="w-full" variant="outline" disabled>
          {t("cta.scheduled")}
        </Button>
      );
    case "activate":
      return (
        <Button className="w-full" variant={isCustom ? "cta" : "default"} onClick={onActivate}>
          {t("cta.activate")}
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
          {plan.is_public ? plan.name : t("custom")}
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
  const t = useTranslations("billing.plans");
  const logout = useLogout();

  return (
    <div className="relative min-h-screen" style={{ background: HERO_GRADIENT }}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo className="h-16" />
          <div className="ms-auto flex items-center gap-2">
            {backHref && (
              <Button variant="cta" render={<Link href={backHref} />}>
                <ArrowLeftIcon className="rtl:-scale-x-100" />
                {t("header.backToBilling")}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? <Spinner /> : <LogOutIcon className="rtl:-scale-x-100" />}
              {logout.isPending ? t("header.signingOut") : t("header.signOut")}
            </Button>
            <LanguagePicker />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export function PlansView() {
  const t = useTranslations("billing.plans");
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
            title={t("loadError")}
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

  const categories = buildFeatureCategories(plans, t);
  const columnCount = plans.length + 1 + (showCustomTeaser ? 1 : 0);
  const gridStyle = { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };

  const ribbonFor = (plan: Plan): string | null => {
    if (plan.id === currentPlanId) return t("currentPlan");
    if (!plan.is_public) return t("custom");
    if (plan.id === highlightId && isNewSubscriber) return t("mostPopular");
    return null;
  };

  const frameClass = (plan: Plan) => (!plan.is_public ? "border-cta" : "border-primary");
  const ribbonClass = (plan: Plan) =>
    !plan.is_public ? "bg-cta text-cta-foreground" : "bg-primary text-primary-foreground";

  const ctaFor = (plan: Plan) => (
    <PlanCta
      plan={plan}
      action={cardAction(plan, interval, subscription, privileged, t)}
      framed={plan.id === highlightId}
      onSubscribe={() => setSubscribeTarget(plan)}
      onChange={() => setChangeTarget(plan)}
      onActivate={() => setCardOpen(true)}
    />
  );

  // The promo's end date, for the "ends 31 March" copy; null when no promo runs.
  const promoEndsAt = setupFeePromoEndsAt();
  const promoEndsLabel = promoEndsAt?.toLocaleDateString(displayLocale(), {
    day: "numeric",
    month: "long",
  });
  const promoValues = {
    was: formatCents(SETUP_FEE_CENTS),
    now: formatCents(SETUP_FEE_PROMO_CENTS),
    s: (chunks: React.ReactNode) => <s className="text-muted-foreground">{chunks}</s>,
    strong: (chunks: React.ReactNode) => <span className="font-semibold">{chunks}</span>,
  };
  const billingLink = (chunks: React.ReactNode) => (
    <Link className="underline underline-offset-4" href={billingHref}>
      {chunks}
    </Link>
  );

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
            {t.rich("hero.title", { br: () => <br /> })}
          </h1>
          <p className="mx-auto mb-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
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
                    {t("notes.saveAnnual")}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("notes.prices")}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("notes.annual")}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("notes.changes")}</p>
          {setupFeeDue && setupFeePromoActive() && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-foreground">
              <Badge variant="success">{t("setupFee.limitedOffer")}</Badge>
              <span>
                {promoEndsLabel
                  ? t.rich("setupFee.promoEnds", { ...promoValues, date: promoEndsLabel })
                  : t.rich("setupFee.promo", promoValues)}
              </span>
            </div>
          )}
          {setupFeeDue && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("setupFee.firstSubscription", { fee: formatCents(currentSetupFeeCents()) })}
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
                <AlertTitle>{t("alerts.suspended.title")}</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>{t("alerts.suspended.body")}</span>
                  <Button size="sm" variant="destructive" render={<Link href={billingHref} />}>
                    {t("alerts.suspended.action")}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {status === "past_due" && (
              <Alert variant="warning">
                <AlertTitle>{t("alerts.pastDue.title")}</AlertTitle>
                <AlertDescription>
                  {t.rich("alerts.pastDue.body", { link: billingLink })}
                </AlertDescription>
              </Alert>
            )}
            {status === "pending" && privileged && (
              <Alert variant="info">
                <AlertTitle>{t("alerts.pending.title")}</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>
                    {subscription?.plan
                      ? t("alerts.pending.bodyWithPlan", {
                          plan: subscription.plan.name,
                          interval: subscription.interval,
                        })
                      : t("alerts.pending.body")}
                  </span>
                  <Button size="sm" onClick={() => setCardOpen(true)}>
                    {t("alerts.pending.action")}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {subscription?.cancel_at_period_end && status !== "cancelled" && (
              <Alert variant="warning">
                <AlertTitle>{t("alerts.cancellation.title")}</AlertTitle>
                <AlertDescription>
                  {subscription.current_period_end
                    ? t.rich("alerts.cancellation.body", {
                        date: formatDate(subscription.current_period_end, business.timezone),
                        link: billingLink,
                      })
                    : t.rich("alerts.cancellation.bodyNoDate", { link: billingLink })}
                </AlertDescription>
              </Alert>
            )}
            {subscription?.pending_plan && (
              <Alert variant="info">
                <AlertTitle>{t("alerts.planChange.title")}</AlertTitle>
                <AlertDescription>
                  {subscription.current_period_end
                    ? t("alerts.planChange.body", {
                        plan: subscription.pending_plan.name,
                        interval: subscription.pending_interval ?? subscription.interval,
                        date: formatDate(subscription.current_period_end, business.timezone),
                      })
                    : t("alerts.planChange.bodyNoDate", {
                        plan: subscription.pending_plan.name,
                        interval: subscription.pending_interval ?? subscription.interval,
                      })}
                </AlertDescription>
              </Alert>
            )}
            {!privileged && (
              <Alert>
                <AlertTitle>{t("alerts.viewOnly.title")}</AlertTitle>
                <AlertDescription>{t("alerts.viewOnly.body")}</AlertDescription>
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
                    <p className="mt-1 text-sm text-muted-foreground">{planDescription(plan, t)}</p>
                    <div className="mt-4">
                      <PriceBlock plan={plan} interval={interval} />
                    </div>
                    <div className="mt-4">{ctaFor(plan)}</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {categories.map((category) => (
                      <div key={category.id}>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">
                          {category.name}
                        </h4>
                        <div className="space-y-2">
                          {category.rows.map((row) => (
                            <div
                              key={row.id}
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
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                    {t("custom")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("customTeaser.description")}
                  </p>
                  <div className="mt-4">
                    <div className="font-heading text-3xl font-semibold text-foreground">
                      {t("custom")}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {t("customTeaser.pricing")}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="w-full" variant="cta" render={<a href={CONTACT_SALES_HREF} />}>
                      {t("customTeaser.contactSales")}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        {category.name}
                      </h4>
                      <div className="space-y-2">
                        {category.rows.map((row) => (
                          <div key={row.id} className="flex items-center justify-between gap-3">
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
                          "absolute -top-px start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-b-lg px-3 py-1 text-xs font-medium whitespace-nowrap",
                          ribbonClass(plan)
                        )}
                      >
                        {ribbon}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                      {planDescription(plan, t)}
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
                  <h3 className="text-lg font-semibold text-foreground">{t("custom")}</h3>
                  <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                    {t("customTeaser.description")}
                  </p>
                  <div className="mt-4">
                    {/* Invisible placeholders keep the row aligned in annual mode. */}
                    {interval === "annual" && <div className="text-sm opacity-0">–</div>}
                    <div className="font-heading text-3xl font-semibold text-foreground">
                      {t("custom")}
                    </div>
                    <div className="text-sm text-muted-foreground">{t("customTeaser.pricing")}</div>
                    {interval === "annual" && <div className="mt-1 text-xs opacity-0">–</div>}
                  </div>
                  <div className="mt-auto pt-4">
                    <Button className="w-full" variant="cta" render={<a href={CONTACT_SALES_HREF} />}>
                      {t("customTeaser.contactSales")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Feature categories */}
            {categories.map((category, categoryIndex) => {
              const isLastCategory = categoryIndex === categories.length - 1;
              return (
                <div key={category.id}>
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
                      <div key={row.id} className="grid" style={gridStyle}>
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
                                  "border-e border-border/60",
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
