"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { taxLineLabel, type BillingInterval, type Plan } from "@/lib/api/types";

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
  const t = useTranslations("billing.change");
  const tc = useTranslations("common");
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
              ? t("toasts.changed", { plan: plan.name })
              : t("toasts.scheduled", { plan: plan.name })
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
          <DialogTitle>{t("title", { plan: plan?.name ?? "", interval })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {preview.isPending && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {t("calculating")}
          </div>
        )}

        {preview.isError && (
          <Alert variant="destructive">
            <AlertTitle>{t("previewError")}</AlertTitle>
            <AlertDescription>{preview.error.message}</AlertDescription>
          </Alert>
        )}

        {data?.immediate === true && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              {t("chargedToday", { amount: formatCents(data.total_cents, data.currency) })}
            </p>
            {data.line_items.map((line, index) => (
              <div
                key={`${line.kind}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <span className={line.amount_cents < 0 ? "text-success" : undefined}>
                  {line.description}
                  {line.quantity > 1 &&
                    ` ${t("lineQuantity", {
                      quantity: line.quantity,
                      unit: formatCents(line.unit_cents, data.currency),
                    })}`}
                </span>
                <span className="tabular-nums">
                  {formatCents(line.amount_cents, data.currency)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>{tc("labels.subtotal")}</span>
              <span className="tabular-nums">
                {formatCents(data.subtotal_cents, data.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>{taxLineLabel()}</span>
              <span className="tabular-nums">{formatCents(data.tax_cents, data.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-medium">
              <span>{t("totalToday")}</span>
              <span className="tabular-nums">
                {formatCents(data.total_cents, data.currency)}
              </span>
            </div>
            {data.credit_banked_cents > 0 && (
              <p className="pt-1 text-xs text-muted-foreground">
                {t("creditBanked", {
                  amount: formatCents(data.credit_banked_cents, data.currency),
                })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("startsImmediately")}</p>
          </div>
        )}

        {data?.immediate === false && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">{t("noChargeToday")}</p>
            <p>
              {data.effective_at
                ? t("scheduledOn", {
                    plan: plan?.name ?? "",
                    interval,
                    date: formatDate(data.effective_at, timezone),
                  })
                : t("scheduledAtRenewal", { plan: plan?.name ?? "", interval })}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button
            onClick={confirm}
            disabled={changePlan.isPending || !data}
          >
            {changePlan.isPending && <Spinner data-icon="inline-start" />}
            {data?.immediate === true
              ? t("confirmAndPay", { amount: formatCents(data.total_cents, data.currency) })
              : t("confirmChange")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
