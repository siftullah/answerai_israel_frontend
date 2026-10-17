"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DURATION_UNITS, type DurationUnit } from "@/lib/api/types";

const UNIT_LABELS: Record<DurationUnit, string> = {
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  years: "Years",
};

/** Service duration block (has_duration, duration_quantity, duration_unit). */
export function DurationEditor() {
  const form = useFormContext();
  const hasDuration = useWatch({ name: "has_duration" }) as boolean;
  const { errors } = form.formState;

  const quantityError = (errors.duration_quantity as { message?: string } | undefined)?.message;
  const unitError = (errors.duration_unit as { message?: string } | undefined)?.message;

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows e.g. "hours".
  const unitItems = DURATION_UNITS.map((unit) => ({
    value: unit,
    label: UNIT_LABELS[unit],
  }));

  return (
    <div className="flex flex-col gap-4">
      <Field orientation="horizontal">
        <Controller
          control={form.control}
          name="has_duration"
          render={({ field }) => (
            <Switch
              id="has_duration"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FieldLabel htmlFor="has_duration" className="font-normal">
          Has a set duration
        </FieldLabel>
      </Field>

      {hasDuration && (
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!quantityError || undefined}>
            <FieldLabel htmlFor="duration_quantity">Duration</FieldLabel>
            <Input
              id="duration_quantity"
              inputMode="decimal"
              placeholder="2"
              autoComplete="off"
              aria-invalid={!!quantityError}
              {...form.register("duration_quantity")}
            />
            {quantityError && <FieldError>{quantityError}</FieldError>}
          </Field>

          <Field data-invalid={!!unitError || undefined}>
            <FieldLabel htmlFor="duration_unit">Unit</FieldLabel>
            <Controller
              control={form.control}
              name="duration_unit"
              render={({ field }) => (
                <Select
                  items={unitItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                >
                  <SelectTrigger
                    id="duration_unit"
                    className="w-full"
                    aria-invalid={!!unitError}
                  >
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {unitError && <FieldError>{unitError}</FieldError>}
          </Field>
        </div>
      )}
    </div>
  );
}
