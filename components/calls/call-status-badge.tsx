import { PhoneIncomingIcon, PhoneOutgoingIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CallDirection, CallStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<CallStatus, string> = {
  queued: "Queued",
  initiating: "Initiating",
  ringing: "Ringing",
  in_progress: "In progress",
  completed: "Completed",
  busy: "Busy",
  no_answer: "No answer",
  failed: "Failed",
  canceled: "Canceled",
};

const STATUS_VARIANTS: Record<
  CallStatus,
  "canceled" | "info" | "success" | "warning" | "destructive"
> = {
  queued: "info",
  initiating: "info",
  ringing: "info",
  in_progress: "info",
  completed: "success",
  busy: "warning",
  no_answer: "warning",
  failed: "destructive",
  canceled: "canceled",
};

const LIVE_STATUSES: readonly CallStatus[] = ["queued", "initiating", "ringing", "in_progress"];

/** The one badge a call gets: its lifecycle status (completed, failed, …). */
export function CallStatusBadge({ status }: { status: CallStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {LIVE_STATUSES.includes(status) && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {STATUS_LABELS[status]}
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
  const Icon = direction === "inbound" ? PhoneIncomingIcon : PhoneOutgoingIcon;
  return (
    <Icon
      aria-label={direction === "inbound" ? "Inbound call" : "Outbound call"}
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}
