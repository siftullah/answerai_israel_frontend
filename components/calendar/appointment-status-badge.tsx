import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/lib/api/types";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/api/types";

/**
 * Mirrors the job badge ladder — tint for pending, fill for strong states:
 * scheduled is the upcoming blue tint, confirmed the locked-in primary fill,
 * completed the filled green terminal. Statuses never wear neutral badges.
 */
const STATUS_VARIANTS: Record<
  AppointmentStatus,
  "info" | "success" | "warning" | "default" | "canceled"
> = {
  scheduled: "info",
  confirmed: "default",
  completed: "success",
  canceled: "canceled",
  no_show: "warning",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}
