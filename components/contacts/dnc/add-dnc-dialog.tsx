"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { useAddDncEntry } from "@/hooks/use-dnc";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  defaultDncEntryValues,
  dncEntrySchema,
  toDncEntryPayload,
  type DncEntryValues,
} from "@/lib/validation/dnc";

/**
 * Adds a number to the do-not-call list. Re-adding an existing number just
 * updates its reason (the POST is restore-or-create), so this dialog also
 * serves as the "edit reason" flow. Mount conditionally so the form starts
 * fresh each open — `prefill` seeds the number when launched from a contact.
 */
export function AddDncDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: { e164: string };
}) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const addEntry = useAddDncEntry(business.id);

  const tv = useTranslations("validation");
  const schema = useMemo(() => dncEntrySchema(tv), [tv]);
  const form = useForm<DncEntryValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultDncEntryValues(prefill?.e164 ?? ""),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    addEntry.mutate(toDncEntryPayload(values), {
      onSuccess: () => {
        toast.success(t("dnc.add.added"));
        onOpenChange(false);
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dnc.add.title")}</DialogTitle>
          <DialogDescription>{t("dnc.add.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.e164 || undefined}>
            <FieldLabel htmlFor="dnc-number">{t("dnc.add.phoneNumber")}</FieldLabel>
            <Input
              id="dnc-number"
              type="tel"
              placeholder={t("phonePlaceholder")}
              autoComplete="off"
              aria-invalid={!!errors.e164}
              {...form.register("e164")}
            />
            {errors.e164 && <FieldError>{errors.e164.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.reason || undefined}>
            <FieldLabel htmlFor="dnc-reason">{t("reasonOptional")}</FieldLabel>
            <Textarea
              id="dnc-reason"
              rows={2}
              placeholder={t("dnc.add.reasonPlaceholder")}
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            {errors.reason && <FieldError>{errors.reason.message}</FieldError>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={addEntry.isPending}>
              {addEntry.isPending && <Spinner />}
              {t("dnc.add.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
