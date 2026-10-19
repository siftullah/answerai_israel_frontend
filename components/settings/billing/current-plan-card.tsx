"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubscriptionStatusBadge } from "@/components/billing/billing-badges";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import type { Subscription } from "@/lib/api/types";

export function CurrentPlanCard({
  businessUuid,
  subscription,
  timezone,
  privileged,
  onCancel,
}: {
  businessUuid: string;
  subscription: Subscription;
  timezone: string;
  privileged: boolean;
  onCancel: () => void;
}) {
  const t = useTranslations("settings.billing");
  const plan = subscription.plan;
  const price =
    plan === undefined
      ? null
      : subscription.interval === "monthly"
        ? plan.monthly_price_cents
        : plan.annual_price_cents;
  const cancelled = subscription.status === "cancelled";
  // On annual plans the usage period rolls monthly while the plan fee is
  // paid to a later date — only then is the extra row worth showing.
  const paidBeyondPeriod =
    subscription.interval === "annual" &&
    subscription.plan_paid_until !== null &&
    subscription.plan_paid_until !== subscription.current_period_end;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{plan?.name ?? t("currentPlan.fallbackTitle")}</CardTitle>
          <SubscriptionStatusBadge status={subscription.status} />
        </div>
        <CardDescription>
          {price !== null
            ? t("currentPlan.priceLine", {
                price: formatCents(price),
                interval: subscription.interval,
              })
            : t("currentPlan.billingLine", { interval: subscription.interval })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {cancelled && subscription.cancelled_at && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t("currentPlan.ended")}</span>
            <span>{formatDate(subscription.cancelled_at, timezone)}</span>
          </div>
        )}
        {!cancelled && subscription.current_period_start && subscription.current_period_end && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t("currentPlan.usagePeriod")}</span>
            <span>
              {formatDate(subscription.current_period_start, timezone)} –{" "}
              {formatDate(subscription.current_period_end, timezone)}
            </span>
          </div>
        )}
        {!cancelled && paidBeyondPeriod && subscription.plan_paid_until && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t("currentPlan.paidUntil")}</span>
            <span>{formatDate(subscription.plan_paid_until, timezone)}</span>
          </div>
        )}
        {subscription.credit_balance_cents > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t("currentPlan.credit")}</span>
            <span className="font-medium text-success">
              {formatCents(subscription.credit_balance_cents)}
            </span>
          </div>
        )}
      </CardContent>
      {privileged && (
        <CardFooter className="gap-2">
          {cancelled ? (
            <Button render={<Link href={`/b/${businessUuid}/plans`} />}>
              {t("choosePlan")}
            </Button>
          ) : (
            <>
              <Button render={<Link href={`/b/${businessUuid}/plans`} />}>
                {t("currentPlan.changePlan")}
              </Button>
              {!subscription.cancel_at_period_end && (
                <Button variant="destructive-outline" onClick={onCancel}>
                  {t("cancelSubscription")}
                </Button>
              )}
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
