"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { useSubscribe } from "@/hooks/use-billing";
import { displayLocale } from "@/lib/i18n/runtime";
import { formatCents } from "@/lib/money";
import {
  SETUP_FEE_CENTS,
  TAX_BP,
  currentSetupFeeCents,
  setupFeePromoActive,
  setupFeePromoEndsAt,
  taxLineLabel,
  type BillingInterval,
  type Plan,
} from "@/lib/api/types";

/** Per-line half-up VAT, matching the backend's Money::tax canon. */
function tax(cents: number): number {
  return Math.round((cents * TAX_BP) / 10000);
}

/**
 * Confirms a new (or re-)subscription before any money moves. Nothing is
 * charged here: subscribing reserves the plan, and the initial charge —
 * these exact figures — runs the moment a card is saved.
 */
export function SubscribeDialog({
  businessUuid,
  plan,
  interval,
  setupFeeDue,
  onOpenChange,
  onSubscribed,
}: {
  businessUuid: string;
  plan: Plan | null;
  interval: BillingInterval;
  setupFeeDue: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribed: () => void;
}) {
  const t = useTranslations("billing.subscribe");
  const tc = useTranslations("common");
  const subscribe = useSubscribe(businessUuid);

  const planFee =
    plan === null
      ? 0
      : interval === "monthly"
        ? plan.monthly_price_cents
        : plan.annual_price_cents;
  const setupFeePromo = setupFeeDue && setupFeePromoActive();
  const setupFee = setupFeeDue ? currentSetupFeeCents() : 0;
  const totalTax = tax(planFee) + tax(setupFee);
  const total = planFee + setupFee + totalTax;
  const promoEndsLabel = setupFeePromoEndsAt()?.toLocaleDateString(displayLocale(), {
    day: "numeric",
    month: "short",
  });

  const confirm = () => {
    if (!plan) return;
    subscribe.mutate(
      { plan: plan.id, interval },
      {
        onSuccess: () => {
          toast.success(t("toasts.reserved", { plan: plan.name }));
          onSubscribed();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { plan: plan?.name ?? "", interval })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {plan && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>{t("planLine", { plan: plan.name, interval })}</span>
              <span className="tabular-nums">{formatCents(planFee)}</span>
            </div>
            {setupFeeDue && (
              <div className="flex items-center justify-between gap-4">
                <span>
                  {t("setupFeeLine")}
                  {setupFeePromo && promoEndsLabel && (
                    <span className="ms-1.5 text-xs font-medium text-success">
                      {t("discountedUntil", { date: promoEndsLabel })}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">
                  {setupFeePromo && (
                    <s className="me-1.5 text-muted-foreground">{formatCents(SETUP_FEE_CENTS)}</s>
                  )}
                  {formatCents(setupFee)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>{taxLineLabel()}</span>
              <span className="tabular-nums">{formatCents(totalTax)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 font-medium">
              <span>{t("dueOnCard")}</span>
              <span className="tabular-nums">{formatCents(total)}</span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              {interval === "monthly" ? t("renewsMonthly") : t("renewsAnnually")}{" "}
              {setupFeeDue && t("setupFeeOnce")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button onClick={confirm} disabled={subscribe.isPending}>
            {subscribe.isPending && <Spinner data-icon="inline-start" />}
            {t("continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
