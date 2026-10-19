"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { CardCaptureDialog } from "@/components/billing/card-capture-dialog";
import { ChargeHistoryCard } from "@/components/settings/billing/charge-history-card";
import { CurrentPlanCard } from "@/components/settings/billing/current-plan-card";
import { PaymentMethodCard } from "@/components/settings/billing/payment-method-card";
import { UsageCard } from "@/components/settings/billing/usage-card";
import {
  useBilling,
  useCancelSubscription,
  useResumeSubscription,
} from "@/hooks/use-billing";
import { formatCents } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { PLAN_ENTITLEMENT_DEFAULTS, type Subscription } from "@/lib/api/types";

export function BillingView() {
  const t = useTranslations("settings.billing");
  const { business, membership } = useBusiness();
  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";
  const router = useRouter();

  const billingQuery = useBilling(business.id);
  const cancelSubscription = useCancelSubscription(business.id);
  const resumeSubscription = useResumeSubscription(business.id);

  const [cardOpen, setCardOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const data = billingQuery.data;
  const subscription = data?.subscription ?? null;

  // Never subscribed: the plans page is the only meaningful destination.
  useEffect(() => {
    if (data && data.subscription === null) {
      router.replace(`/b/${business.id}/plans`);
    }
  }, [data, router, business.id]);

  // Defence-in-depth: the sidebar hides this for members, but a deep link
  // shouldn't reach the billing controls either.
  const cancelDialogDescription = (current: Subscription): string => {
    switch (current.status) {
      case "pending":
        return t("cancelDialog.pending");
      case "suspended":
        return t("cancelDialog.suspended");
      default:
        return current.current_period_end
          ? t("cancelDialog.active", {
              date: formatDate(current.current_period_end, business.timezone),
            })
          : t("cancelDialog.activeNoDate");
    }
  };

  if (!privileged) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("descriptionMember")} />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t("notAvailable.title")}</CardTitle>
            <CardDescription>{t("notAvailable.description")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (billingQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (billingQuery.isError) {
    return (
      <ErrorState
        title={t("loadError")}
        message={billingQuery.error.message}
        onRetry={() => billingQuery.refetch()}
      />
    );
  }

  if (!data || !subscription) {
    // Momentary while the redirect above lands.
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t("noSubscription.title")}</CardTitle>
            <CardDescription>{t("noSubscription.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href={`/b/${business.id}/plans`} />}>
              {t("choosePlan")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entitlements = {
    ...PLAN_ENTITLEMENT_DEFAULTS,
    ...(subscription.plan?.entitlements ?? {}),
  };
  const inDunning =
    subscription.status === "past_due" || subscription.status === "suspended";
  const failedCharge = data.recent_charges.find((charge) => charge.status === "failed");

  const confirmCancel = () => {
    cancelSubscription.mutate(undefined, {
      onSuccess: (updated) =>
        toast.success(
          updated.status === "cancelled"
            ? t("toasts.cancelled")
            : t("toasts.cancelScheduled")
        ),
      onError: (error) => toast.error(error.message),
    });
    setCancelOpen(false);
  };

  const resume = () => {
    resumeSubscription.mutate(undefined, {
      onSuccess: () => toast.success(t("toasts.resumed")),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      {subscription.status === "suspended" && (
        <Alert variant="destructive">
          <AlertTitle>{t("alerts.suspended.title")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {failedCharge
                ? t("alerts.suspended.failedCharge", {
                    amount: formatCents(failedCharge.total_cents, failedCharge.currency),
                  })
                : t("alerts.suspended.failedGeneric")}{" "}
              {t("alerts.suspended.body")}
            </span>
            <span>
              <Button size="sm" variant="destructive" onClick={() => setCardOpen(true)}>
                {t("updateCard")}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {subscription.status === "past_due" && (
        <Alert variant="warning">
          <AlertTitle>{t("alerts.pastDue.title")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {failedCharge
                ? t("alerts.pastDue.failedCharge", {
                    amount: formatCents(failedCharge.total_cents, failedCharge.currency),
                  })
                : t("alerts.pastDue.failedGeneric")}
              {failedCharge?.next_retry_at &&
                ` ${t("alerts.pastDue.nextRetry", {
                  date: formatDateTime(failedCharge.next_retry_at, business.timezone),
                })}`}{" "}
              {t("alerts.pastDue.body")}
            </span>
            <span>
              <Button size="sm" variant="warning" onClick={() => setCardOpen(true)}>
                {t("updateCard")}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {subscription.status === "pending" && (
        <Alert variant="info">
          <AlertTitle>{t("alerts.pending.title")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>
              {subscription.plan
                ? `${t("alerts.pending.reserved", { plan: subscription.plan.name })} `
                : ""}
              {t("alerts.pending.body")}
            </span>
            <Button size="sm" onClick={() => setCardOpen(true)}>
              {t("addCard")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {subscription.cancel_at_period_end && subscription.status !== "cancelled" && (
        <Alert variant="warning">
          <AlertTitle>{t("alerts.cancellation.title")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>
              {subscription.current_period_end
                ? t("alerts.cancellation.body", {
                    date: formatDate(subscription.current_period_end, business.timezone),
                  })
                : t("alerts.cancellation.bodyNoDate")}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={resume}
              disabled={resumeSubscription.isPending}
            >
              {t("alerts.cancellation.resume")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {subscription.pending_plan && (
        <Alert variant="info">
          <AlertTitle>{t("alerts.planChange.title")}</AlertTitle>
          <AlertDescription>
            {subscription.current_period_end
              ? t.rich("alerts.planChange.body", {
                  plan: subscription.pending_plan.name,
                  interval: subscription.pending_interval ?? subscription.interval,
                  date: formatDate(subscription.current_period_end, business.timezone),
                  link: (chunks) => (
                    <Link
                      className="underline underline-offset-4"
                      href={`/b/${business.id}/plans`}
                    >
                      {chunks}
                    </Link>
                  ),
                })
              : t.rich("alerts.planChange.bodyNoDate", {
                  plan: subscription.pending_plan.name,
                  interval: subscription.pending_interval ?? subscription.interval,
                  link: (chunks) => (
                    <Link
                      className="underline underline-offset-4"
                      href={`/b/${business.id}/plans`}
                    >
                      {chunks}
                    </Link>
                  ),
                })}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPlanCard
          businessUuid={business.id}
          subscription={subscription}
          timezone={business.timezone}
          privileged={privileged}
          onCancel={() => setCancelOpen(true)}
        />
        <PaymentMethodCard
          subscription={subscription}
          privileged={privileged}
          retriesFailedCharge={inDunning}
          onUpdateCard={() => setCardOpen(true)}
        />
      </div>

      {data.usage && (
        <UsageCard
          usage={data.usage}
          entitlements={entitlements}
          timezone={business.timezone}
        />
      )}

      <ChargeHistoryCard businessUuid={business.id} timezone={business.timezone} />

      <CardCaptureDialog
        businessUuid={business.id}
        open={cardOpen}
        onOpenChange={setCardOpen}
        intent={subscription.status === "pending" ? "activate" : "update"}
        retriesFailedCharge={inDunning}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{cancelDialogDescription(subscription)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDialog.keep")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmCancel}>
              {t("cancelSubscription")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
