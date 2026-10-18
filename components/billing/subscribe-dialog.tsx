"use client";

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
import { formatCents } from "@/lib/money";
import {
  BILLING_INTERVAL_LABELS,
  SETUP_FEE_CENTS,
  TAX_BP,
  TAX_LINE_LABEL,
  currentSetupFeeCents,
  setupFeePromoActive,
  setupFeePromoEndsAt,
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
  const promoEndsLabel = setupFeePromoEndsAt()?.toLocaleDateString("en-IL", {
    day: "numeric",
    month: "short",
  });

  const confirm = () => {
    if (!plan) return;
    subscribe.mutate(
      { plan: plan.id, interval },
      {
        onSuccess: () => {
          toast.success(`${plan.name} reserved — add a card to start.`);
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
          <DialogTitle>
            Subscribe to {plan?.name} ({BILLING_INTERVAL_LABELS[interval].toLowerCase()})
          </DialogTitle>
          <DialogDescription>
            Nothing is charged yet — this first charge runs as soon as your card is added.
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>
                {plan.name} plan (
                {interval === "monthly" ? "first month" : "first year"})
              </span>
              <span className="tabular-nums">{formatCents(planFee)}</span>
            </div>
            {setupFeeDue && (
              <div className="flex items-center justify-between gap-4">
                <span>
                  One-time setup &amp; onboarding
                  {setupFeePromo && promoEndsLabel && (
                    <span className="ml-1.5 text-xs font-medium text-success">
                      discounted until {promoEndsLabel}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">
                  {setupFeePromo && (
                    <s className="mr-1.5 text-muted-foreground">{formatCents(SETUP_FEE_CENTS)}</s>
                  )}
                  {formatCents(setupFee)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>{TAX_LINE_LABEL}</span>
              <span className="tabular-nums">{formatCents(totalTax)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 font-medium">
              <span>Due when your card is added</span>
              <span className="tabular-nums">{formatCents(total)}</span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              {interval === "monthly"
                ? "Renews monthly. Usage beyond your included allowances is billed with each renewal."
                : "The plan renews yearly; usage beyond your included allowances is still billed monthly."}{" "}
              {setupFeeDue && "The setup fee is once per business — never charged again."}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={subscribe.isPending}>
            {subscribe.isPending && <Spinner data-icon="inline-start" />}
            Continue to card details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
