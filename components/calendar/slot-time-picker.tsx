"use client";

import { useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeInput } from "@/components/ui/time-input";
import { useBusiness } from "@/components/business/business-provider";
import { useCalendarSlots } from "@/hooks/use-calendar-slots";
import { addDaysToDateKey, formatTimeOfDay, zonedDayRangeToUtc } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * The time half of a booking form: suggested slots from /calendar/slots
 * (respecting availability, buffers, notice, and the member's connected
 * calendar) or a typed custom time — which the backend deliberately does not
 * check, so double-booking is possible and we say so.
 */
export function SlotTimePicker({
  idPrefix,
  dateKey,
  memberId,
  slotIso,
  onSlotChange,
  time,
  onTimeChange,
  error,
  initialMode = "slots",
}: {
  idPrefix: string;
  /** Calendar key; "" until a date is picked. */
  dateKey: string;
  /** User uuid; "" = the unassigned pool. */
  memberId: string;
  slotIso: string;
  onSlotChange: (iso: string) => void;
  time: string;
  onTimeChange: (time: string) => void;
  error?: string;
  initialMode?: "slots" | "custom";
}) {
  const { business } = useBusiness();
  const [mode, setMode] = useState<"slots" | "custom">(initialMode);

  const range =
    dateKey !== ""
      ? zonedDayRangeToUtc(dateKey, addDaysToDateKey(dateKey, 1), business.timezone)
      : null;
  const slotsQuery = useCalendarSlots(
    business.id,
    mode === "slots" && range !== null ? { ...range, memberId } : null
  );

  const changeMode = (next: "slots" | "custom") => {
    setMode(next);
    // The two inputs are alternatives — leaving one clears it.
    if (next === "slots") onTimeChange("");
    else onSlotChange("");
  };

  return (
    <Field data-invalid={!!error || undefined}>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={`${idPrefix}-time`}>Time</FieldLabel>
        <Tabs value={mode} onValueChange={(value) => changeMode(value as "slots" | "custom")}>
          <TabsList>
            <TabsTrigger value="slots">Open slots</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "slots" ? (
        dateKey === "" ? (
          <p className="text-sm text-muted-foreground">Pick a date to see open slots.</p>
        ) : slotsQuery.isPending ? (
          <div className="flex justify-center py-4">
            <Spinner className="size-4" />
          </div>
        ) : slotsQuery.isError ? (
          <p className="text-sm text-destructive">
            Couldn&apos;t load slots — switch to a custom time or try another day.
          </p>
        ) : slotsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open slots this day — try another day, or use a custom time.
          </p>
        ) : (
          <div className="scrollbar-slim grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
            {slotsQuery.data.map((slot) => {
              const selected = slot.starts_at === slotIso;
              return (
                <button
                  key={slot.starts_at}
                  type="button"
                  onClick={() => onSlotChange(selected ? "" : slot.starts_at)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted",
                    selected &&
                      "border-primary bg-primary/10 font-medium text-primary hover:bg-primary/15"
                  )}
                >
                  {formatTimeOfDay(slot.starts_at, business.timezone)}
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          <TimeInput
            id={`${idPrefix}-time`}
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
            aria-invalid={!!error}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TriangleAlertIcon className="size-3.5 shrink-0 text-warning" aria-hidden />
            Custom times skip the availability check — double-booking is allowed.
          </p>
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
