"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useForm } from "react-hook-form";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompleteCallback } from "@/hooks/use-callbacks";
import {
  applyCallbackServerErrors,
  completeCallbackSchema,
  defaultCompleteCallbackValues,
  toCompleteCallbackPayload,
  type CompleteCallbackValues,
} from "@/lib/validation/callback";
import type { Callback, CallbackOutcome } from "@/lib/api/types";
import { CALLBACK_OUTCOME_LABELS, CALLBACK_OUTCOMES } from "@/lib/api/types";

export function CompleteCallbackDialog({
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
  const completeCallback = useCompleteCallback(businessUuid);
  const t = useTranslations("callbacks");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => completeCallbackSchema(tv), [tv]);

  // Notes prefilled: completing with notes overwrites the callback's notes,
  // so starting from the existing text prevents accidental clearing.
  const form = useForm<CompleteCallbackValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultCompleteCallbackValues(callback.notes),
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const outcomeItems = CALLBACK_OUTCOMES.map((outcome) => ({
    value: outcome,
    label: CALLBACK_OUTCOME_LABELS[outcome],
  }));

  const onSubmit = form.handleSubmit((values) => {
    completeCallback.mutate(
      { id: callback.id, payload: toCompleteCallbackPayload(values) },
      {
        onSuccess: () => {
          toast.success(t("toasts.completed"));
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
          <DialogTitle>{t("completeDialog.title")}</DialogTitle>
          <DialogDescription>
            {callback.contact?.name
              ? t("completeDialog.descriptionNamed", { name: callback.contact.name })
              : t("completeDialog.descriptionUnnamed")}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Controller
              name="outcome"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error || undefined}>
                  <FieldLabel htmlFor="complete-callback-outcome">
                    {t("labels.outcome")}
                  </FieldLabel>
                  <Select
                    items={outcomeItems}
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange((value as CallbackOutcome | null) ?? "handled")
                    }
                  >
                    <SelectTrigger
                      id="complete-callback-outcome"
                      className="w-full"
                      aria-invalid={!!fieldState.error}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {outcomeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Field data-invalid={!!form.formState.errors.notes || undefined}>
              <FieldLabel htmlFor="complete-callback-notes">{tc("labels.notes")}</FieldLabel>
              <Textarea
                id="complete-callback-notes"
                {...form.register("notes")}
                rows={3}
                placeholder={t("completeDialog.notesPlaceholder")}
                aria-invalid={!!form.formState.errors.notes}
              />
              {form.formState.errors.notes?.message && (
                <FieldError>{form.formState.errors.notes.message}</FieldError>
              )}
            </Field>

            {rootServerError?.message && (
              <Alert variant="destructive">
                <AlertDescription>{rootServerError.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={completeCallback.isPending}>
                {completeCallback.isPending ? t("actions.completing") : t("actions.markCompleted")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
