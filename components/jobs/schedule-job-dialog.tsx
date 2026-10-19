"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { TimeInput } from "@/components/ui/time-input";
import { useBusiness } from "@/components/business/business-provider";
import { useRescheduleJob, useScheduleJob } from "@/hooks/use-jobs";
import { useModuleSettings } from "@/hooks/use-modules";
import { utcIsoToZonedFields, zonedDateTimeToUtcIso } from "@/lib/datetime";
import {
  scheduleJobSchema,
  type ScheduleJobValues,
} from "@/lib/validation/job";
import type { Job, JobModuleSettings } from "@/lib/api/types";

/**
 * Books (or re-times) the visit in the business timezone. The backend derives
 * the window's end from the job's estimate (falling back to the module
 * default) and emails the customer — deliberately no slot enforcement, staff
 * may double-book.
 */
export function ScheduleJobDialog({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const scheduleJob = useScheduleJob(business.id);
  const rescheduleJob = useRescheduleJob(business.id);
  const settingsQuery = useModuleSettings<JobModuleSettings>(business.id, "jobs");

  const rescheduling = job.status !== "open";
  const mutation = rescheduling ? rescheduleJob : scheduleJob;

  const durationMinutes =
    job.estimated_minutes ?? settingsQuery.data?.default_estimated_minutes ?? 60;

  const tv = useTranslations("validation");
  const schema = useMemo(() => scheduleJobSchema(tv), [tv]);
  const form = useForm<ScheduleJobValues>({
    resolver: zodResolver(schema),
    defaultValues: job.scheduled_start
      ? utcIsoToZonedFields(job.scheduled_start, business.timezone)
      : { date: "", time: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(
      {
        id: job.id,
        starts_at: zonedDateTimeToUtcIso(values.date, values.time, business.timezone),
      },
      {
        onSuccess: () => {
          toast.success(
            rescheduling
              ? t("toasts.rescheduled", { reference: job.reference })
              : t("toasts.booked", { reference: job.reference })
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rescheduling
              ? t("schedule.rescheduleTitle", { reference: job.reference })
              : t("schedule.scheduleTitle", { reference: job.reference })}
          </DialogTitle>
          <DialogDescription>
            {rescheduling
              ? t("schedule.rescheduleDescription")
              : t("schedule.scheduleDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error || undefined}>
                  <FieldLabel htmlFor="schedule-job-date">{tc("labels.date")}</FieldLabel>
                  <DatePicker
                    id="schedule-job-date"
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!fieldState.error}
                    disablePast
                  />
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Field data-invalid={!!form.formState.errors.time || undefined}>
              <FieldLabel htmlFor="schedule-job-time">{t("schedule.startTime")}</FieldLabel>
              <TimeInput
                id="schedule-job-time"
                {...form.register("time")}
                aria-invalid={!!form.formState.errors.time}
              />
              {form.formState.errors.time?.message && (
                <FieldError>{form.formState.errors.time.message}</FieldError>
              )}
            </Field>
          </div>

          <FieldDescription>
            {rescheduling
              ? t("schedule.keepsLength")
              : job.estimated_minutes === null
                ? t("schedule.bookedForDefault", { minutes: durationMinutes })
                : t("schedule.bookedFor", { minutes: durationMinutes })}{" "}
            {t("schedule.timezone", { timezone: business.timezone })}
          </FieldDescription>

          {mutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? rescheduling
                  ? t("schedule.rescheduling")
                  : t("schedule.booking")
                : rescheduling
                  ? t("schedule.reschedule")
                  : t("schedule.book")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
