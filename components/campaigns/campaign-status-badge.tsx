import { Badge } from "@/components/ui/badge";
import type { CampaignRecipientStatus, CampaignStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
};

const STATUS_VARIANTS: Record<
  CampaignStatus,
  "canceled" | "secondary" | "info" | "success" | "warning"
> = {
  draft: "secondary",
  scheduled: "info",
  running: "info",
  paused: "warning",
  completed: "success",
  canceled: "canceled",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {status === "running" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const RECIPIENT_LABELS: Record<CampaignRecipientStatus, string> = {
  pending: "Pending",
  queued: "Queued",
  calling: "Calling",
  completed: "Completed",
  retry_scheduled: "Retry scheduled",
  failed: "Failed",
  max_attempts: "Max attempts",
  dnc_blocked: "On DNC",
  invalid: "Invalid",
  skipped: "Skipped",
  canceled: "Canceled",
};

const RECIPIENT_VARIANTS: Record<
  CampaignRecipientStatus,
  "canceled" | "secondary" | "info" | "success" | "warning" | "destructive"
> = {
  pending: "secondary",
  queued: "info",
  calling: "info",
  completed: "success",
  retry_scheduled: "warning",
  failed: "destructive",
  max_attempts: "destructive",
  dnc_blocked: "warning",
  invalid: "destructive",
  skipped: "warning",
  canceled: "canceled",
};

export function CampaignRecipientStatusBadge({
  status,
}: {
  status: CampaignRecipientStatus;
}) {
  return (
    <Badge variant={RECIPIENT_VARIANTS[status]}>
      {status === "calling" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {RECIPIENT_LABELS[status]}
    </Badge>
  );
}
