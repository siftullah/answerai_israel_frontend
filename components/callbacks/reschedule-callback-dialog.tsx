"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
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
import { useBusiness } from "@/components/business/business-provider";
import { ScheduleField } from "@/components/callbacks/schedule-field";
import { useRescheduleCallback } from "@/hooks/use-callbacks";
import { utcIsoToZonedFields } from "@/lib/datetime";
import {
  applyCallbackServerErrors,
  rescheduleCallbackSchema,
  toReschedulePayload,
  type RescheduleCallbackValues,
} from "@/lib/validation/callback";
import type { Callback } from "@/lib/api/types";

export function RescheduleCallbackDialog({
  open,
  onOpenChange,
  businessUuid,
  callback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUuid: string;
  callback: Callback;
}) {
  const { business } = useBusiness();
  const reschedule = useRescheduleCallback(businessUuid);

  const t = useTranslations("callbacks");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => rescheduleCallbackSchema(tv), [tv]);
  const form = useForm<RescheduleCallbackValues>({
    resolver: zodResolver(schema),
    defaultValues: utcIsoToZonedFields(callback.scheduled_at, business.timezone),
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const onSubmit = form.handleSubmit((values) => {
    reschedule.mutate(
      { id: callback.id, ...toReschedulePayload(values, business.timezone) },
      {
        onSuccess: () => {
          toast.success(t("toasts.rescheduled"));
          onOpenChange(false);
        },
        onError: (error) => applyCallbackServerErrors(form, error),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rescheduleDialog.title")}</DialogTitle>
          <DialogDescription>{t("rescheduleDialog.description")}</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <ScheduleField<RescheduleCallbackValues>
              dateName="date"
              timeName="time"
              idPrefix="reschedule-callback"
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
                {reschedule.isPending ? t("actions.rescheduling") : t("actions.reschedule")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
