"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { SLOT_INTERVALS } from "@/lib/api/types";
import type { AgentSettingsValues } from "@/lib/validation/agent";
import { cn } from "@/lib/utils";

// "inherit" is a Select sentinel for the form's "" (Base UI items need
// non-empty values); the mapper only ever sees "".
const SLOT_ITEMS = [
  { value: "inherit", label: "Inherit" },
  ...SLOT_INTERVALS.map((interval) => ({
    value: String(interval),
    label: `${interval} minutes`,
  })),
];

const BOOKINGS_MODE_ITEMS = [
  { value: "inherit", label: "Inherit" },
  { value: "no_cap", label: "No daily cap" },
  { value: "custom", label: "Custom limit" },
];

function hasOverrides(calendar: AgentSettingsValues["calendar"]): boolean {
  return (
    calendar.slot_interval_minutes !== "" ||
    calendar.min_notice_minutes !== "" ||
    calendar.max_horizon_days !== "" ||
    calendar.buffer_minutes !== "" ||
    calendar.max_bookings_mode !== "inherit" ||
    calendar.appointment_duration_minutes !== "" ||
    calendar.callback_duration_minutes !== ""
  );
}

export function CalendarSection() {
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;
  const calendarErrors = errors.calendar;

  const [open, setOpen] = useState(() => hasOverrides(form.getValues("calendar")));
  const bookingsMode = form.watch("calendar.max_bookings_mode");

  const numberField = (
    name:
      | "min_notice_minutes"
      | "max_horizon_days"
      | "buffer_minutes"
      | "appointment_duration_minutes"
      | "callback_duration_minutes",
    label: string,
    hint: string
  ) => {
    const error = calendarErrors?.[name];
    return (
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor={`calendar-${name}`}>{label}</FieldLabel>
        <Input
          id={`calendar-${name}`}
          type="number"
          placeholder="Inherit"
          aria-invalid={!!error}
          {...form.register(`calendar.${name}`)}
        />
        {error ? (
          <FieldError>{error.message}</FieldError>
        ) : (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </Field>
    );
  };

  return (
    <AgentSection
      id="calendar"
      title="Calendar"
      description="Booking mechanics for this agent only — anything left on Inherit uses your business and team-member calendar settings."
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger render={<Button type="button" variant="outline" size="sm" />}>
          {open ? "Hide overrides" : "Show overrides"}
          <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 pt-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="calendar-slot-interval">Slot interval</FieldLabel>
              <Controller
                control={form.control}
                name="calendar.slot_interval_minutes"
                render={({ field }) => (
                  <Select
                    items={SLOT_ITEMS}
                    value={field.value === "" ? "inherit" : field.value}
                    onValueChange={(value) =>
                      field.onChange(value === "inherit" || value === null ? "" : value)
                    }
                  >
                    <SelectTrigger id="calendar-slot-interval" className="w-full" disabled={disabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {numberField("min_notice_minutes", "Minimum notice (minutes)", "0 – 10,080")}
            {numberField("max_horizon_days", "Booking horizon (days)", "1 – 365")}
            {numberField("buffer_minutes", "Buffer between bookings (minutes)", "0 – 240")}

            <Field>
              <FieldLabel htmlFor="calendar-bookings-mode">Daily booking limit</FieldLabel>
              <Controller
                control={form.control}
                name="calendar.max_bookings_mode"
                render={({ field }) => (
                  <Select
                    items={BOOKINGS_MODE_ITEMS}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value !== null) field.onChange(value);
                    }}
                  >
                    <SelectTrigger id="calendar-bookings-mode" className="w-full" disabled={disabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKINGS_MODE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {bookingsMode === "custom" && (
              <Field data-invalid={!!calendarErrors?.max_bookings_per_day || undefined}>
                <FieldLabel htmlFor="calendar-max-bookings">Maximum per day</FieldLabel>
                <Input
                  id="calendar-max-bookings"
                  type="number"
                  aria-invalid={!!calendarErrors?.max_bookings_per_day}
                  {...form.register("calendar.max_bookings_per_day")}
                />
                {calendarErrors?.max_bookings_per_day ? (
                  <FieldError>{calendarErrors.max_bookings_per_day.message}</FieldError>
                ) : (
                  <p className="text-xs text-muted-foreground">1 – 100</p>
                )}
              </Field>
            )}

            {numberField(
              "appointment_duration_minutes",
              "Appointment length (minutes)",
              "5 – 1,440"
            )}
            {numberField("callback_duration_minutes", "Callback length (minutes)", "5 – 240")}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </AgentSection>
  );
}
