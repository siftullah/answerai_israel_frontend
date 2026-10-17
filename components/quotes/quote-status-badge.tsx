import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/lib/api/types";
import { QUOTE_STATUS_LABELS } from "@/lib/api/types";

/**
 * Accepted is the filled-green terminal state (completed convention) and void
 * the black-filled deliberate one (canceled convention). Declined is the hard
 * no (red); expired is recoverable, so it warns rather than alarms.
 */
const STATUS_VARIANTS: Record<
  QuoteStatus,
  "outline" | "info" | "success" | "destructive" | "warning" | "canceled"
> = {
  draft: "outline",
  sent: "info",
  accepted: "success",
  declined: "destructive",
  expired: "warning",
  void: "canceled",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}
