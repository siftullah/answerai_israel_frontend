"use client";

import { BotIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { formatTimeOfDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/api/types";
import { UPCOMING_APPOINTMENT_STATUSES } from "@/lib/api/types";

/** Rendered beside the status — an open booking whose end passed unrecorded. */
export function NeedsReviewBadge() {
  const t = useTranslations("appointments");
  return <Badge variant="warning">{t("row.needsReview")}</Badge>;
}

/** An open booking whose end has passed without an outcome being recorded. */
export function appointmentNeedsReview(appointment: Appointment, nowMs: number) {
  return (
    UPCOMING_APPOINTMENT_STATUSES.includes(appointment.status) &&
    Date.parse(appointment.ends_at) < nowMs
  );
}

export function AppointmentListRow({
  appointment,
  selected,
  timeZone,
  nowMs,
  onSelect,
}: {
  appointment: Appointment;
  selected: boolean;
  timeZone: string;
  nowMs: number;
  onSelect: () => void;
}) {
  const t = useTranslations("appointments");
  const needsReview = appointmentNeedsReview(appointment, nowMs);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full flex-col gap-1 rounded-xl border px-3 py-3 text-start outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected
          ? "border-primary/40 bg-primary/[0.07]"
          : needsReview
            ? "border-warning/30 bg-warning/5 hover:bg-warning/10"
            : "border-border bg-card hover:bg-muted/60"
      )}
    >
      {/* Contact + time range */}
      <div className="flex w-full items-baseline gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px] font-semibold",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {appointment.contact?.name ?? "—"}
        </span>
        <span className="shrink-0 text-xs whitespace-nowrap tabular-nums text-foreground/55">
          {formatTimeOfDay(appointment.starts_at, timeZone)} –{" "}
          {formatTimeOfDay(appointment.ends_at, timeZone)}
        </span>
      </div>

      {/* Assignee + status */}
      <div className="flex w-full items-center gap-2">
        {appointment.source === "agent_call" && (
          <BotIcon aria-label={t("row.bookedByAi")} className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-cta">
          {appointment.member?.name ?? t("unassigned")}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {needsReview && <NeedsReviewBadge />}
          {appointment.status !== "scheduled" && (
            <AppointmentStatusBadge status={appointment.status} />
          )}
        </span>
      </div>

      {/* Notes */}
      {appointment.notes && (
        <p className="w-full truncate text-sm text-foreground/75">{appointment.notes}</p>
      )}
    </button>
  );
}
