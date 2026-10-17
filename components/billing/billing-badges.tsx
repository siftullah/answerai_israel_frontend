import { Badge } from "@/components/ui/badge";
import {
  BILLING_CHARGE_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type BillingChargeStatus,
  type SubscriptionStatus,
} from "@/lib/api/types";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

const SUBSCRIPTION_BADGE_VARIANTS: Record<SubscriptionStatus, BadgeVariant> = {
  active: "success",
  pending: "info",
  past_due: "warning",
  suspended: "destructive",
  // Cancelling is deliberate, not a failure — the stark neutral badge.
  cancelled: "canceled",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge variant={SUBSCRIPTION_BADGE_VARIANTS[status]}>
      {SUBSCRIPTION_STATUS_LABELS[status]}
    </Badge>
  );
}

const CHARGE_BADGE_VARIANTS: Record<BillingChargeStatus, BadgeVariant> = {
  paid: "success",
  pending: "info",
  failed: "destructive",
};

export function ChargeStatusBadge({ status }: { status: BillingChargeStatus }) {
  return (
    <Badge variant={CHARGE_BADGE_VARIANTS[status]}>{BILLING_CHARGE_STATUS_LABELS[status]}</Badge>
  );
}
