"use client";

import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { dayKey, formatDate, formatDateKey } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/api/types";

/** The row's third line: where this lead is in its life, date-first. */
function dateLine(lead: Lead, timeZone: string): { text: string; warn: boolean } {
  switch (lead.status) {
    case "won":
      return {
        text: lead.closed_at ? `Won ${formatDate(lead.closed_at, timeZone)}` : "Won",
        warn: false,
      };
    case "lost":
      return {
        text: lead.closed_at ? `Lost ${formatDate(lead.closed_at, timeZone)}` : "Lost",
        warn: false,
      };
    default: {
      if (lead.expected_close_date) {
        const overdue = lead.expected_close_date < dayKey(new Date().toISOString(), timeZone);
        return {
          text: `Close expected ${formatDateKey(lead.expected_close_date)}`,
          warn: overdue,
        };
      }
      return {
        text:
          lead.source === "agent_call"
            ? `Captured from a call ${formatDate(lead.created_at, timeZone)}`
            : `Added ${formatDate(lead.created_at, timeZone)}`,
        warn: false,
      };
    }
  }
}

export function LeadListRow({
  lead,
  selected,
  timeZone,
  onSelect,
}: {
  lead: Lead;
  selected: boolean;
  timeZone: string;
  onSelect: () => void;
}) {
  const line = dateLine(lead, timeZone);

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
          {lead.title}
        </span>
        {lead.value_cents !== null && (
          <span className="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">
            {formatCents(lead.value_cents, lead.currency ?? "ILS")}
          </span>
        )}
      </div>

      {/* Contact + status */}
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/75">
          {lead.contact?.name ?? "—"}
        </span>
        <LeadStatusBadge status={lead.status} />
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
