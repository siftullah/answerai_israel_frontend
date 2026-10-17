"use client";

import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { TimeInput } from "@/components/ui/time-input";

/**
 * Shared date + time pair for the schedule forms. Field names are generic so
 * create and reschedule can both mount it; the parent's payload mapper
 * composes the pair into a UTC instant in the business timezone. Server-side
 * time rejections (outside hours, slot busy) land on the time field.
 */
export function ScheduleField<T extends FieldValues>({
  dateName,
  timeName,
  idPrefix,
}: {
  dateName: Path<T>;
  timeName: Path<T>;
  idPrefix: string;
}) {
  const form = useFormContext<T>();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Controller
        name={dateName}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-date`}>Date</FieldLabel>
            <DatePicker
              id={`${idPrefix}-date`}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              invalid={!!fieldState.error}
              disablePast
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />
      <Controller
        name={timeName}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-time`}>Time</FieldLabel>
            <TimeInput
              id={`${idPrefix}-time`}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              aria-invalid={!!fieldState.error}
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />
    </div>
  );
}
