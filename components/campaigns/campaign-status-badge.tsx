import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { CampaignRecipientStatus, CampaignStatus } from "@/lib/api/types";

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
  const t = useTranslations("campaigns");
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {status === "running" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {t(`status.${status}`)}
    </Badge>
  );
}

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
  const t = useTranslations("campaigns");
  return (
    <Badge variant={RECIPIENT_VARIANTS[status]}>
      {status === "calling" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {t(`recipientStatus.${status}`)}
    </Badge>
  );
}
