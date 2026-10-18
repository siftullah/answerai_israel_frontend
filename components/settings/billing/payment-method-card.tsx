"use client";

import { CreditCardIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Subscription } from "@/lib/api/types";

export function PaymentMethodCard({
  subscription,
  privileged,
  retriesFailedCharge,
  onUpdateCard,
}: {
  subscription: Subscription;
  privileged: boolean;
  /** past_due/suspended — saving a card immediately retries the failed charge. */
  retriesFailedCharge: boolean;
  onUpdateCard: () => void;
}) {
  const card = subscription.payment_method;
  const now = new Date();
  // Cards expire at the END of their expiry month.
  const expired =
    card !== null &&
    new Date(card.exp_year, card.exp_month, 1) <= now;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment method</CardTitle>
        <CardDescription>
          Charged for renewals, usage and plan changes. Card details are held by Stripe —
          never on our servers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {card ? (
          <div className="flex items-center gap-3">
            <CreditCardIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="capitalize">{card.brand}</span> •••• {card.last4}
                {expired && <Badge variant="destructive">Expired</Badge>}
              </span>
              <span className="text-sm text-muted-foreground">
                Expires {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-muted-foreground">
            <CreditCardIcon className="size-5 shrink-0" />
            <p className="text-sm">No card on file yet.</p>
          </div>
        )}
      </CardContent>
      {privileged && (
        <CardFooter className="flex-col items-start gap-2">
          {card ? (
            <Button variant="cta" onClick={onUpdateCard}>
              Update card
            </Button>
          ) : (
            <Button onClick={onUpdateCard}>Add card</Button>
          )}
          {retriesFailedCharge && (
            <p className="text-xs text-muted-foreground">
              Saving a new card immediately retries the failed charge.
            </p>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
