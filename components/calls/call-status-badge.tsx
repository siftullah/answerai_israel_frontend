import { useTranslations } from "next-intl";
import { PhoneIncomingIcon, PhoneOutgoingIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CallDirection, CallStatus } from "@/lib/api/types";

/** Translated label per call lifecycle status (shared by the badge and the filters). */
export function useCallStatusLabels(): Record<CallStatus, string> {
  const t = useTranslations("calls.status");
  return {
    queued: t("queued"),
    initiating: t("initiating"),
    ringing: t("ringing"),
    in_progress: t("inProgress"),
    completed: t("completed"),
    voicemail: t("voicemail"),
    busy: t("busy"),
    no_answer: t("noAnswer"),
    failed: t("failed"),
    canceled: t("canceled"),
  };
}

const STATUS_VARIANTS: Record<
  CallStatus,
  "canceled" | "info" | "success" | "warning" | "destructive"
> = {
  queued: "info",
  initiating: "info",
  ringing: "info",
  in_progress: "info",
  completed: "success",
  voicemail: "warning",
  busy: "warning",
  no_answer: "warning",
  failed: "destructive",
  canceled: "canceled",
};

const LIVE_STATUSES: readonly CallStatus[] = ["queued", "initiating", "ringing", "in_progress"];

/** The one badge a call gets: its lifecycle status (completed, failed, …). */
export function CallStatusBadge({ status }: { status: CallStatus }) {
  const labels = useCallStatusLabels();
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {LIVE_STATUSES.includes(status) && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {labels[status]}
    </Badge>
  );
}

export function CallDirectionIcon({
  direction,
  className,
}: {
  direction: CallDirection;
  className?: string;
}) {
  const t = useTranslations("calls.direction");
  const Icon = direction === "inbound" ? PhoneIncomingIcon : PhoneOutgoingIcon;
  return (
    <Icon
      aria-label={direction === "inbound" ? t("inbound") : t("outbound")}
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}
