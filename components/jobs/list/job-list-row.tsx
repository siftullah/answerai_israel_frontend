"use client";

import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-status-badge";
import { formatDate, formatDateAndTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/api/types";

/** The row's third line: where this job is in its life, visit-first. */
function dateLine(job: Job, timeZone: string, nowMs: number): { text: string; warn: boolean } {
  switch (job.status) {
    case "completed":
      return {
        text: job.completed_at ? `Completed ${formatDate(job.completed_at, timeZone)}` : "Completed",
        warn: false,
      };
    case "canceled":
      return {
        text: job.canceled_at ? `Canceled ${formatDate(job.canceled_at, timeZone)}` : "Canceled",
        warn: false,
      };
    case "in_progress":
      return {
        text: job.scheduled_start
          ? `Started — booked ${formatDateAndTime(job.scheduled_start, timeZone)}`
          : "In progress",
        warn: false,
      };
    case "scheduled": {
      // A booked window that has already passed without the job moving on.
      const overdue =
        job.scheduled_end !== null && new Date(job.scheduled_end).getTime() < nowMs;
      return {
        text: job.scheduled_start
          ? `${overdue ? "Was booked" : "Booked"} ${formatDateAndTime(job.scheduled_start, timeZone)}`
          : "Scheduled",
        warn: overdue,
      };
    }
    default:
      return {
        text:
          job.source === "agent_call"
            ? `Captured from a call ${formatDate(job.created_at, timeZone)} — needs a time`
            : `Added ${formatDate(job.created_at, timeZone)} — needs a time`,
        warn: job.priority === "high",
      };
  }
}

export function JobListRow({
  job,
  selected,
  timeZone,
  nowMs,
  onSelect,
}: {
  job: Job;
  selected: boolean;
  timeZone: string;
  nowMs: number;
  onSelect: () => void;
}) {
  const line = dateLine(job, timeZone, nowMs);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left outline-none transition-colors focus-visible:bg-muted",
        selected
          ? "bg-primary/[0.07]"
          : line.warn
            ? "bg-warning/[0.04] hover:bg-warning/[0.08]"
            : "hover:bg-muted/60"
      )}
    >
      {/* Title + value */}
      <div className="flex w-full items-baseline gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px] font-semibold",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {job.title}
        </span>
        {job.quote_cents !== null && (
          <span className="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">
            {formatCents(job.quote_cents, job.currency ?? "AUD")}
          </span>
        )}
      </div>

      {/* Reference + contact + status */}
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/75">
          <span className="tabular-nums">{job.reference}</span>
          {job.contact?.name ? ` · ${job.contact.name}` : ""}
        </span>
        <JobPriorityBadge priority={job.priority} />
        <JobStatusBadge status={job.status} />
      </div>

      {/* Lifecycle date */}
      <span
        className={cn("text-xs", line.warn ? "font-medium text-warning" : "text-muted-foreground")}
      >
        {line.text}
      </span>
    </button>
  );
}
