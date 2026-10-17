import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/api/types";
import { LEAD_STATUS_LABELS } from "@/lib/api/types";

/**
 * New is the needs-triage state (info blue with a pulse), contacted the neutral
 * being-worked grey, qualified the high-intent primary fill. Won is the filled
 * green terminal (completed convention); lost is the hard no (red) — the black
 * canceled fill stays reserved for deliberately abandoned records.
 */
const STATUS_VARIANTS: Record<
  LeadStatus,
  "info" | "secondary" | "default" | "success" | "destructive"
> = {
  new: "info",
  contacted: "secondary",
  qualified: "default",
  won: "success",
  lost: "destructive",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {status === "new" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
