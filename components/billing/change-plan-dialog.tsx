"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useChangePlan, useChangePlanPreview } from "@/hooks/use-billing";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  BILLING_INTERVAL_LABELS,
  TAX_LINE_LABEL,
  type BillingInterval,
  type Plan,
} from "@/lib/api/types";

/**
 * Change-plan confirmation, backed by POST /billing/change-plan/preview:
 * upgrades show the exact charge that will run today (proration credit
 * included); downgrades and interval switches show the scheduled date and
 * charge nothing.
 */
export function ChangePlanDialog({
  businessUuid,
  plan,
  interval,
  timezone,
  onOpenChange,
}: {
  businessUuid: string;
  plan: Plan | null;
  interval: BillingInterval;
  timezone: string;
  onOpenChange: (open: boolean) => void;
}) {
  const preview = useChangePlanPreview();
  const changePlan = useChangePlan(businessUuid);
  const { mutate: runPreview, reset: resetPreview } = preview;

  const planId = plan?.id ?? null;
  useEffect(() => {
    if (planId === null) {
      resetPreview();
      return;
    }
    runPreview({ plan: planId, interval });
  }, [planId, interval, runPreview, resetPreview]);

  const confirm = () => {
    if (!plan) return;
    const immediate = preview.data?.immediate === true;
    changePlan.mutate(
      { plan: plan.id, interval },
      {
        onSuccess: () => {
          toast.success(
            immediate
              ? `You're now on ${plan.name}.`
              : `Plan change to ${plan.name} scheduled.`
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const data = preview.data;

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Change to {plan?.name} ({BILLING_INTERVAL_LABELS[interval].toLowerCase()})
          </DialogTitle>
          <DialogDescription>
            Review what happens before anything changes.
          </DialogDescription>
        </DialogHeader>

        {preview.isPending && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Calculating…
          </div>
        )}

        {preview.isError && (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t preview this change</AlertTitle>
            <AlertDescription>{preview.error.message}</AlertDescription>
          </Alert>
        )}

        {data?.immediate === true && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              You&apos;ll be charged {formatCents(data.total_cents, data.currency)} today.
            </p>
            {data.line_items.map((line, index) => (
              <div
                key={`${line.kind}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <span className={line.amount_cents < 0 ? "text-success" : undefined}>
                  {line.description}
                  {line.quantity > 1 &&
                    ` (${line.quantity} × ${formatCents(line.unit_cents, data.currency)})`}
                </span>
                <span className="tabular-nums">
                  {formatCents(line.amount_cents, data.currency)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatCents(data.subtotal_cents, data.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>{TAX_LINE_LABEL}</span>
              <span className="tabular-nums">{formatCents(data.tax_cents, data.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-medium">
              <span>Total today</span>
              <span className="tabular-nums">
                {formatCents(data.total_cents, data.currency)}
              </span>
            </div>
            {data.credit_banked_cents > 0 && (
              <p className="pt-1 text-xs text-muted-foreground">
                {formatCents(data.credit_banked_cents, data.currency)} of unused prepaid time
                becomes account credit and is applied to future charges automatically.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Your new plan and a fresh billing period start immediately.
            </p>
          </div>
        )}

        {data?.immediate === false && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">No charge today.</p>
            <p>
              Your plan changes to {plan?.name} (
              {BILLING_INTERVAL_LABELS[interval].toLowerCase()}) on{" "}
              {data.effective_at
                ? formatDate(data.effective_at, timezone)
                : "the next renewal"}
              . Until then everything stays on your current plan.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={changePlan.isPending || !data}
          >
            {changePlan.isPending && <Spinner data-icon="inline-start" />}
            {data?.immediate === true
              ? `Confirm & pay ${formatCents(data.total_cents, data.currency)}`
              : "Confirm change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
