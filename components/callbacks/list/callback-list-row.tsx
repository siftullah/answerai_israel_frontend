"use client";

import {
  CallbackStatusBadge,
  CallbackTypeIcon,
  OverdueBadge,
} from "@/components/callbacks/callback-status-badge";
import { formatDateAndTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Callback } from "@/lib/api/types";

export function CallbackListRow({
  callback,
  selected,
  timeZone,
  onSelect,
}: {
  callback: Callback;
  selected: boolean;
  timeZone: string;
  onSelect: () => void;
}) {
  const number = formatE164(callback.to_e164);
  const name = callback.contact?.name ?? number;
  const who = callback.type === "agent" ? callback.agent?.name : callback.assignee?.name;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left outline-none transition-colors focus-visible:bg-muted",
        selected
          ? "bg-primary/[0.07]"
          : callback.overdue
            ? "bg-warning/5 hover:bg-warning/10"
            : "hover:bg-muted/60"
      )}
    >
      {/* Contact + scheduled time */}
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
          {formatDateAndTime(callback.scheduled_at, timeZone)}
        </span>
      </div>

      {/* Number */}
      {name !== number && (
        <span className="text-[13px] tabular-nums text-foreground/70">{number}</span>
      )}

      {/* Who handles it + status */}
      <div className="flex w-full items-center gap-2">
        <CallbackTypeIcon type={callback.type} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-cta">
          {who ?? "—"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {callback.overdue && <OverdueBadge />}
          {callback.status !== "scheduled" && <CallbackStatusBadge status={callback.status} />}
        </span>
      </div>

      {/* Topic */}
      {callback.topic && (
        <p className="w-full truncate text-sm text-foreground/75">{callback.topic}</p>
      )}
    </button>
  );
}
