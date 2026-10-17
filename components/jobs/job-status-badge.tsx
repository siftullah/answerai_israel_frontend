import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/api/types";
import { JOB_STATUS_LABELS } from "@/lib/api/types";

/**
 * Open is the unscheduled work queue (amber with a pulse — book it in),
 * scheduled the booked in-flight blue, in progress the primary fill (on the
 * tools right now). Completed is the filled green terminal (completed
 * convention); the black canceled fill stays reserved for deliberately
 * abandoned records.
 */
const STATUS_VARIANTS: Record<JobStatus, "warning" | "info" | "default" | "success" | "canceled"> =
  {
    open: "warning",
    scheduled: "info",
    in_progress: "default",
    completed: "success",
    canceled: "canceled",
  };

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {status === "open" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Only the exceptions get a badge — normal priority is the quiet default. */
export function JobPriorityBadge({ priority }: { priority: "low" | "normal" | "high" }) {
  if (priority === "normal") return null;

  return (
    <Badge variant={priority === "high" ? "destructive" : "outline"}>
      {priority === "high" ? "High priority" : "Low priority"}
    </Badge>
  );
}
