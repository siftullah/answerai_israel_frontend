import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/api/types";
import { INVOICE_STATUS_LABELS } from "@/lib/api/types";

/**
 * Paid is the filled-green terminal state (completed convention) and void the
 * black-filled deliberate one (canceled convention); overdue is the page's
 * strongest signal, so it gets the red.
 */
const STATUS_VARIANTS: Record<
  InvoiceStatus,
  "outline" | "info" | "success" | "destructive" | "canceled"
> = {
  draft: "outline",
  sent: "info",
  paid: "success",
  overdue: "destructive",
  void: "canceled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}
