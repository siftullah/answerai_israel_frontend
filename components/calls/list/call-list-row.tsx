"use client";

import { PhoneForwardedIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CallStatusBadge } from "@/components/calls/call-status-badge";
import { counterpartName, counterpartNumber } from "@/components/calls/call-identity";
import { formatDateAndTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Call } from "@/lib/api/types";

export function CallListRow({
  call,
  selected,
  timeZone,
  onSelect,
}: {
  call: Call;
  selected: boolean;
  timeZone: string;
  onSelect: () => void;
}) {
  const name = counterpartName(call);
  const number = formatE164(counterpartNumber(call));
  const showNumber = name !== number;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left outline-none transition-colors focus-visible:bg-muted",
        selected ? "bg-primary/[0.07]" : "hover:bg-muted/60"
      )}
    >
      {/* Name + date/time */}
      <div className="flex w-full items-baseline gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px] font-semibold",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {name}
        </span>
        <span className="shrink-0 text-xs whitespace-nowrap tabular-nums text-foreground/55">
          {formatDateAndTime(call.created_at, timeZone)}
        </span>
      </div>

      {/* Number */}
      {showNumber && (
        <span className="text-[13px] tabular-nums text-foreground/70">{number}</span>
      )}

      {/* Agent + status */}
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-cta">
          {call.agent?.name ?? "—"}
        </span>
        {/* Non-interactive (the row is a button); the detail header carries the link. */}
        {call.callback && (
          <Badge variant="outline" className="h-5">
            <PhoneForwardedIcon />
            Callback
          </Badge>
        )}
        {call.status !== "completed" && <CallStatusBadge status={call.status} />}
      </div>

      {/* Summary headline */}
      {call.summary_title && (
        <p className="w-full truncate text-sm text-foreground/75">{call.summary_title}</p>
      )}
    </button>
  );
}
