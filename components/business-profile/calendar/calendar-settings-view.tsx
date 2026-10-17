"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import {
  useBusinessCalendarSettings,
  useUpdateBusinessCalendarSettings,
} from "@/hooks/use-business-calendar-settings";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { SLOT_INTERVALS, type CalendarBusinessSettings } from "@/lib/api/types";

// Base UI's SelectValue renders the raw value unless the root knows the
// item labels — without this the trigger shows e.g. "15" instead of "15 minutes".
const INTERVAL_ITEMS = SLOT_INTERVALS.map((interval) => ({
  value: String(interval),
  label: `${interval} minutes`,
}));
import {
  calendarSettingsSchema,
  toCalendarSettingsPayload,
  toCalendarSettingsValues,
  type CalendarSettingsValues,
} from "@/lib/validation/calendar-settings";

export function CalendarSettingsView() {
  const { business } = useBusiness();
  const settingsQuery = useBusinessCalendarSettings(business.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Booking defaults for appointments and callbacks. Members can carry their own overrides."
      />

      {settingsQuery.isPending ? (
        <Skeleton className="h-96 w-full max-w-2xl" />
      ) : settingsQuery.isError ? (
        <ErrorState
          title="Couldn't load calendar settings"
          message={settingsQuery.error.message}
          onRetry={() => settingsQuery.refetch()}
        />
      ) : (
        <SettingsForm businessUuid={business.id} settings={settingsQuery.data} />
      )}
    </div>
  );
}

function SettingsForm({
  businessUuid,
  settings,
}: {
  businessUuid: string;
  settings: CalendarBusinessSettings;
}) {
  const update = useUpdateBusinessCalendarSettings(businessUuid);

  const form = useForm<CalendarSettingsValues>({
    resolver: zodResolver(calendarSettingsSchema),
    defaultValues: toCalendarSettingsValues(settings),
  });
  const { errors, isDirty } = form.formState;
  const limitBookings = form.watch("limit_bookings");

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toCalendarSettingsPayload(values), {
      onSuccess: (updated) => {
        form.reset(toCalendarSettingsValues(updated));
        toast.success("Calendar settings saved");
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
      {errors.root?.server && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Booking rules</CardTitle>
          <CardDescription>How slots are offered when your AI books for callers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="slot_interval_minutes">Slot interval</FieldLabel>
            <Controller
              control={form.control}
              name="slot_interval_minutes"
              render={({ field }) => (
                <Select
                  items={INTERVAL_ITEMS}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                >
                  <SelectTrigger id="slot_interval_minutes" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field data-invalid={!!errors.min_notice_minutes || undefined}>
            <FieldLabel htmlFor="min_notice_minutes">Minimum notice (minutes)</FieldLabel>
            <Input
              id="min_notice_minutes"
              inputMode="numeric"
              placeholder="120"
              autoComplete="off"
              aria-invalid={!!errors.min_notice_minutes}
              {...form.register("min_notice_minutes")}
            />
            <p className="text-sm text-muted-foreground">2 hours = 120.</p>
            {errors.min_notice_minutes && (
              <FieldError>{errors.min_notice_minutes.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.max_horizon_days || undefined}>
            <FieldLabel htmlFor="max_horizon_days">Booking horizon (days)</FieldLabel>
            <Input
              id="max_horizon_days"
              inputMode="numeric"
              placeholder="60"
              autoComplete="off"
              aria-invalid={!!errors.max_horizon_days}
              {...form.register("max_horizon_days")}
            />
            {errors.max_horizon_days && (
              <FieldError>{errors.max_horizon_days.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.buffer_minutes || undefined}>
            <FieldLabel htmlFor="buffer_minutes">Buffer between bookings (minutes)</FieldLabel>
            <Input
              id="buffer_minutes"
              inputMode="numeric"
              placeholder="15"
              autoComplete="off"
              aria-invalid={!!errors.buffer_minutes}
              {...form.register("buffer_minutes")}
            />
            {errors.buffer_minutes && <FieldError>{errors.buffer_minutes.message}</FieldError>}
          </Field>

          <Field className="sm:col-span-2" orientation="horizontal">
            <Controller
              control={form.control}
              name="limit_bookings"
              render={({ field }) => (
                <Switch
                  id="limit_bookings"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <FieldLabel htmlFor="limit_bookings" className="font-normal">
              Limit bookings per day
            </FieldLabel>
          </Field>

          {limitBookings && (
            <Field data-invalid={!!errors.max_bookings_per_day || undefined}>
              <FieldLabel htmlFor="max_bookings_per_day">Maximum per day</FieldLabel>
              <Input
                id="max_bookings_per_day"
                inputMode="numeric"
                placeholder="8"
                autoComplete="off"
                aria-invalid={!!errors.max_bookings_per_day}
                {...form.register("max_bookings_per_day")}
              />
              {errors.max_bookings_per_day && (
                <FieldError>{errors.max_bookings_per_day.message}</FieldError>
              )}
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Durations</CardTitle>
          <CardDescription>Default lengths for AI-booked slots.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.appointment_duration_minutes || undefined}>
            <FieldLabel htmlFor="appointment_duration_minutes">
              Appointment (minutes)
            </FieldLabel>
            <Input
              id="appointment_duration_minutes"
              inputMode="numeric"
              placeholder="30"
              autoComplete="off"
              aria-invalid={!!errors.appointment_duration_minutes}
              {...form.register("appointment_duration_minutes")}
            />
            {errors.appointment_duration_minutes && (
              <FieldError>{errors.appointment_duration_minutes.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.callback_duration_minutes || undefined}>
            <FieldLabel htmlFor="callback_duration_minutes">Callback (minutes)</FieldLabel>
            <Input
              id="callback_duration_minutes"
              inputMode="numeric"
              placeholder="15"
              autoComplete="off"
              aria-invalid={!!errors.callback_duration_minutes}
              {...form.register("callback_duration_minutes")}
            />
            {errors.callback_duration_minutes && (
              <FieldError>{errors.callback_duration_minutes.message}</FieldError>
            )}
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        {isDirty && (
          <Button type="button" variant="ghost" onClick={() => form.reset()}>
            Discard changes
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
