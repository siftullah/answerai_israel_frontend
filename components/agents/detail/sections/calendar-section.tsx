"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("agents.sections.calendar");
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;
  const calendarErrors = errors.calendar;

  const [open, setOpen] = useState(() => hasOverrides(form.getValues("calendar")));
  const bookingsMode = form.watch("calendar.max_bookings_mode");

  // "inherit" is a Select sentinel for the form's "" (Base UI items need
  // non-empty values); the mapper only ever sees "".
  const slotItems = [
    { value: "inherit", label: t("inherit") },
    ...SLOT_INTERVALS.map((interval) => ({
      value: String(interval),
      label: t("minutes", { count: interval }),
    })),
  ];

  const bookingsModeItems = [
    { value: "inherit", label: t("inherit") },
    { value: "no_cap", label: t("bookingsMode.no_cap") },
    { value: "custom", label: t("bookingsMode.custom") },
  ];

  const numberField = (
    name:
      | "min_notice_minutes"
      | "max_horizon_days"
      | "buffer_minutes"
      | "appointment_duration_minutes"
      | "callback_duration_minutes",
    label: string,
    range: { min: number; max: number }
  ) => {
    const error = calendarErrors?.[name];
    return (
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor={`calendar-${name}`}>{label}</FieldLabel>
        <Input
          id={`calendar-${name}`}
          type="number"
          placeholder={t("inherit")}
          aria-invalid={!!error}
          {...form.register(`calendar.${name}`)}
        />
        {error ? (
          <FieldError>{error.message}</FieldError>
        ) : (
          <p className="text-xs text-muted-foreground">{t("range", range)}</p>
        )}
      </Field>
    );
  };

  return (
    <AgentSection id="calendar" title={t("title")} description={t("description")}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger render={<Button type="button" variant="outline" size="sm" />}>
          {open ? t("hideOverrides") : t("showOverrides")}
          <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 pt-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="calendar-slot-interval">{t("slotInterval")}</FieldLabel>
              <Controller
                control={form.control}
                name="calendar.slot_interval_minutes"
                render={({ field }) => (
                  <Select
                    items={slotItems}
                    value={field.value === "" ? "inherit" : field.value}
                    onValueChange={(value) =>
                      field.onChange(value === "inherit" || value === null ? "" : value)
                    }
                  >
                    <SelectTrigger id="calendar-slot-interval" className="w-full" disabled={disabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {slotItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {numberField("min_notice_minutes", t("minNotice"), { min: 0, max: 10080 })}
            {numberField("max_horizon_days", t("maxHorizon"), { min: 1, max: 365 })}
            {numberField("buffer_minutes", t("buffer"), { min: 0, max: 240 })}

            <Field>
              <FieldLabel htmlFor="calendar-bookings-mode">{t("dailyLimit")}</FieldLabel>
              <Controller
                control={form.control}
                name="calendar.max_bookings_mode"
                render={({ field }) => (
                  <Select
                    items={bookingsModeItems}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value !== null) field.onChange(value);
                    }}
                  >
                    <SelectTrigger id="calendar-bookings-mode" className="w-full" disabled={disabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bookingsModeItems.map((item) => (
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
                <FieldLabel htmlFor="calendar-max-bookings">{t("maxPerDay")}</FieldLabel>
                <Input
                  id="calendar-max-bookings"
                  type="number"
                  aria-invalid={!!calendarErrors?.max_bookings_per_day}
                  {...form.register("calendar.max_bookings_per_day")}
                />
                {calendarErrors?.max_bookings_per_day ? (
                  <FieldError>{calendarErrors.max_bookings_per_day.message}</FieldError>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("range", { min: 1, max: 100 })}
                  </p>
                )}
              </Field>
            )}

            {numberField("appointment_duration_minutes", t("appointmentLength"), {
              min: 5,
              max: 1440,
            })}
            {numberField("callback_duration_minutes", t("callbackLength"), { min: 5, max: 240 })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </AgentSection>
  );
}
