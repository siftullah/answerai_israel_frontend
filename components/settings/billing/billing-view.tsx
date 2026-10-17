"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  BILLING_INTERVAL_LABELS,
  PLAN_ENTITLEMENT_DEFAULTS,
  type Subscription,
} from "@/lib/api/types";

function cancelDialogDescription(subscription: Subscription, timezone: string): string {
  switch (subscription.status) {
    case "pending":
      return "This ends your subscription setup. Nothing has been charged, and you can start again any time.";
    case "suspended":
      return "Service is already paused; cancelling ends the subscription immediately. Any outstanding balance remains payable.";
    default:
      return `Your subscription stays active until ${
        subscription.current_period_end
          ? formatDate(subscription.current_period_end, timezone)
          : "the end of the current period"
      }. After that the AI stops answering calls and the portal locks until you resubscribe. You can resume any time before then.`;
  }
}

export function BillingView() {
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
  if (!privileged) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" description="Manage your subscription and payment details." />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Not available</CardTitle>
            <CardDescription>
              Billing is managed by the business owner and admins.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (billingQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" description="Your plan, usage and payment details." />
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
        title="Couldn't load billing"
        message={billingQuery.error.message}
        onRetry={() => billingQuery.refetch()}
      />
    );
  }

  if (!data || !subscription) {
    // Momentary while the redirect above lands.
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" description="Your plan, usage and payment details." />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>No subscription yet</CardTitle>
            <CardDescription>Pick a plan to get your AI receptionist answering.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href={`/b/${business.id}/plans`} />}>Choose a plan</Button>
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
            ? "Subscription cancelled."
            : "Cancellation scheduled for the end of the period."
        ),
      onError: (error) => toast.error(error.message),
    });
    setCancelOpen(false);
  };

  const resume = () => {
    resumeSubscription.mutate(undefined, {
      onSuccess: () => toast.success("Cancellation removed — your subscription continues."),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" description="Your plan, usage and payment details." />

      {subscription.status === "suspended" && (
        <Alert variant="destructive">
          <AlertTitle>Service suspended — payment required</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {failedCharge
                ? `A charge of ${formatCents(failedCharge.total_cents, failedCharge.currency)} couldn't be collected.`
                : "A payment couldn't be collected."}{" "}
              Inbound calls play a service-paused message and outbound calling is blocked.
              Updating your card retries the charge immediately and restores service as soon as
              it succeeds. Phone numbers are released after 30 days of suspension.
            </span>
            <span>
              <Button size="sm" variant="destructive" onClick={() => setCardOpen(true)}>
                Update card
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {subscription.status === "past_due" && (
        <Alert variant="warning">
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {failedCharge
                ? `We couldn't charge ${formatCents(failedCharge.total_cents, failedCharge.currency)} to your card.`
                : "We couldn't charge your card."}
              {failedCharge?.next_retry_at &&
                ` The next automatic retry is ${formatDateTime(failedCharge.next_retry_at, business.timezone)}.`}{" "}
              Service continues for now, but repeated failures lead to suspension. Updating your
              card retries the charge right away.
            </span>
            <span>
              <Button size="sm" variant="warning" onClick={() => setCardOpen(true)}>
                Update card
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {subscription.status === "pending" && (
        <Alert variant="info">
          <AlertTitle>Add a card to activate your subscription</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>
              {subscription.plan ? `${subscription.plan.name} is reserved. ` : ""}
              Your first charge runs — and your AI starts answering — the moment a card is
              saved.
            </span>
            <Button size="sm" onClick={() => setCardOpen(true)}>
              Add card
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {subscription.cancel_at_period_end && subscription.status !== "cancelled" && (
        <Alert variant="warning">
          <AlertTitle>Cancellation scheduled</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>
              Your subscription ends on{" "}
              {subscription.current_period_end
                ? formatDate(subscription.current_period_end, business.timezone)
                : "the current period's end"}
              . Service continues until then.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={resume}
              disabled={resumeSubscription.isPending}
            >
              Resume subscription
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {subscription.pending_plan && (
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
            . To keep your current plan instead, pick it again on the{" "}
            <Link className="underline underline-offset-4" href={`/b/${business.id}/plans`}>
              plans page
            </Link>
            .
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
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialogDescription(subscription, business.timezone)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmCancel}>
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
