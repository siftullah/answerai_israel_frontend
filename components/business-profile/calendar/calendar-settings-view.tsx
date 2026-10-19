"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
import {
  calendarSettingsSchema,
  toCalendarSettingsPayload,
  toCalendarSettingsValues,
  type CalendarSettingsValues,
} from "@/lib/validation/calendar-settings";

export function CalendarSettingsView() {
  const t = useTranslations("businessProfile.calendar");
  const { business } = useBusiness();
  const settingsQuery = useBusinessCalendarSettings(business.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {settingsQuery.isPending ? (
        <Skeleton className="h-96 w-full max-w-2xl" />
      ) : settingsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
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
  const t = useTranslations("businessProfile.calendar");
  const ts = useTranslations("businessProfile.shared");
  const tc = useTranslations("common");
  const update = useUpdateBusinessCalendarSettings(businessUuid);

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows e.g. "15" instead of "15 minutes".
  const intervalItems = SLOT_INTERVALS.map((interval) => ({
    value: String(interval),
    label: t("intervalMinutes", { count: interval }),
  }));

  const tv = useTranslations("validation");
  const schema = useMemo(() => calendarSettingsSchema(tv), [tv]);
  const form = useForm<CalendarSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: toCalendarSettingsValues(settings),
  });
  const { errors, isDirty } = form.formState;
  const limitBookings = form.watch("limit_bookings");

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toCalendarSettingsPayload(values), {
      onSuccess: (updated) => {
        form.reset(toCalendarSettingsValues(updated));
        toast.success(t("toasts.saved"));
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
          <CardTitle>{t("bookingRules.title")}</CardTitle>
          <CardDescription>{t("bookingRules.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="slot_interval_minutes">{t("bookingRules.slotInterval")}</FieldLabel>
            <Controller
              control={form.control}
              name="slot_interval_minutes"
              render={({ field }) => (
                <Select
                  items={intervalItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                >
                  <SelectTrigger id="slot_interval_minutes" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalItems.map((item) => (
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
            <FieldLabel htmlFor="min_notice_minutes">{t("bookingRules.minNotice")}</FieldLabel>
            <Input
              id="min_notice_minutes"
              inputMode="numeric"
              placeholder={t("bookingRules.minNoticePlaceholder")}
              autoComplete="off"
              aria-invalid={!!errors.min_notice_minutes}
              {...form.register("min_notice_minutes")}
            />
            <p className="text-sm text-muted-foreground">{t("bookingRules.minNoticeHint")}</p>
            {errors.min_notice_minutes && (
              <FieldError>{errors.min_notice_minutes.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.max_horizon_days || undefined}>
            <FieldLabel htmlFor="max_horizon_days">{t("bookingRules.horizon")}</FieldLabel>
            <Input
              id="max_horizon_days"
              inputMode="numeric"
              placeholder={t("bookingRules.horizonPlaceholder")}
              autoComplete="off"
              aria-invalid={!!errors.max_horizon_days}
              {...form.register("max_horizon_days")}
            />
            {errors.max_horizon_days && (
              <FieldError>{errors.max_horizon_days.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.buffer_minutes || undefined}>
            <FieldLabel htmlFor="buffer_minutes">{t("bookingRules.buffer")}</FieldLabel>
            <Input
              id="buffer_minutes"
              inputMode="numeric"
              placeholder={t("bookingRules.bufferPlaceholder")}
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
              {t("bookingRules.limitBookings")}
            </FieldLabel>
          </Field>

          {limitBookings && (
            <Field data-invalid={!!errors.max_bookings_per_day || undefined}>
              <FieldLabel htmlFor="max_bookings_per_day">{t("bookingRules.maxPerDay")}</FieldLabel>
              <Input
                id="max_bookings_per_day"
                inputMode="numeric"
                placeholder={t("bookingRules.maxPerDayPlaceholder")}
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
          <CardTitle>{t("durations.title")}</CardTitle>
          <CardDescription>{t("durations.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.appointment_duration_minutes || undefined}>
            <FieldLabel htmlFor="appointment_duration_minutes">
              {t("durations.appointment")}
            </FieldLabel>
            <Input
              id="appointment_duration_minutes"
              inputMode="numeric"
              placeholder={t("durations.appointmentPlaceholder")}
              autoComplete="off"
              aria-invalid={!!errors.appointment_duration_minutes}
              {...form.register("appointment_duration_minutes")}
            />
            {errors.appointment_duration_minutes && (
              <FieldError>{errors.appointment_duration_minutes.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.callback_duration_minutes || undefined}>
            <FieldLabel htmlFor="callback_duration_minutes">{t("durations.callback")}</FieldLabel>
            <Input
              id="callback_duration_minutes"
              inputMode="numeric"
              placeholder={t("durations.callbackPlaceholder")}
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
            {ts("discardChanges")}
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          {tc("actions.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
