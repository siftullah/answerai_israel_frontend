"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useBusiness } from "@/components/business/business-provider";
import { SlotTimePicker } from "@/components/calendar/slot-time-picker";
import { useRescheduleAppointment } from "@/hooks/use-appointments";
import { utcIsoToZonedFields } from "@/lib/datetime";
import {
  applyAppointmentServerErrors,
  rescheduleAppointmentSchema,
  toRescheduleAppointmentPayload,
  type RescheduleAppointmentValues,
} from "@/lib/validation/appointment";

/**
 * Re-times the booking; duration and assignee stay put and the pushed calendar
 * copy is patched in place. The contact gets an updated confirmation email.
 */
export function RescheduleAppointmentDialog({
  open,
  onOpenChange,
  appointmentUuid,
  startsAt,
  memberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentUuid: string;
  /** Current UTC start — prefills the pickers. */
  startsAt: string;
  /** Assignee user uuid ("" = unassigned) — scopes the suggested slots. */
  memberId: string;
}) {
  const t = useTranslations("calendar.rescheduleDialog");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const reschedule = useRescheduleAppointment(business.id);

  const tv = useTranslations("validation");
  const schema = useMemo(() => rescheduleAppointmentSchema(tv), [tv]);
  const form = useForm<RescheduleAppointmentValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...utcIsoToZonedFields(startsAt, business.timezone), slot_iso: "" },
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const onSubmit = form.handleSubmit((values) => {
    reschedule.mutate(
      { id: appointmentUuid, ...toRescheduleAppointmentPayload(values, business.timezone) },
      {
        onSuccess: () => {
          toast.success(t("toasts.rescheduled"));
          onOpenChange(false);
        },
        onError: (error) => applyAppointmentServerErrors(form, error),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="reschedule-appointment-date">
                  {tc("labels.date")}
                </FieldLabel>
                <DatePicker
                  id="reschedule-appointment-date"
                  ref={field.ref}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    form.setValue("slot_iso", "");
                  }}
                  invalid={!!fieldState.error}
                  disablePast
                />
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <SlotTimePicker
            idPrefix="reschedule-appointment"
            dateKey={form.watch("date")}
            memberId={memberId}
            slotIso={form.watch("slot_iso")}
            onSlotChange={(iso) => form.setValue("slot_iso", iso, { shouldValidate: true })}
            time={form.watch("time")}
            onTimeChange={(time) => form.setValue("time", time, { shouldValidate: true })}
            error={form.formState.errors.time?.message}
            initialMode="custom"
          />

          {rootServerError?.message && (
            <Alert variant="destructive">
              <AlertDescription>{rootServerError.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={reschedule.isPending}>
              {reschedule.isPending ? t("rescheduling") : t("reschedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
