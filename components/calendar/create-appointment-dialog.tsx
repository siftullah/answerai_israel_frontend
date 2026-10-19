"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { ContactCombobox } from "@/components/callbacks/contact-combobox";
import { SlotTimePicker } from "@/components/calendar/slot-time-picker";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useMembers } from "@/hooks/use-members";
import {
  applyAppointmentServerErrors,
  createAppointmentSchema,
  defaultCreateAppointmentValues,
  toStoreAppointmentPayload,
  type CreateAppointmentValues,
} from "@/lib/validation/appointment";
import type { Appointment, Contact } from "@/lib/api/types";

/**
 * Staff booking. Suggested slots come from the availability engine; a custom
 * time is allowed on purpose (staff may double-book — matching the backend).
 * The assignee decides whose calendar takes the copy; unassigned lands in the
 * shared pool.
 */
export function CreateAppointmentDialog({
  open,
  onOpenChange,
  onCreated,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (appointment: Appointment) => void;
  /** Prefill for grid-click entry points. */
  defaults?: Partial<CreateAppointmentValues>;
}) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const membersQuery = useMembers(business.id);
  const createAppointment = useCreateAppointment(business.id);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const tv = useTranslations("validation");
  const schema = useMemo(() => createAppointmentSchema(tv), [tv]);
  const form = useForm<CreateAppointmentValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultCreateAppointmentValues(defaults),
  });
  const contactError = form.formState.errors.contact_id;
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const assigneeItems = [
    { value: "", label: t("assign.unassignedPool") },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  // Slots depend on both — changing either invalidates a picked slot.
  const clearSlot = () => form.setValue("slot_iso", "", { shouldValidate: false });

  const onSubmit = form.handleSubmit((values) => {
    createAppointment.mutate(toStoreAppointmentPayload(values, business.timezone), {
      onSuccess: (appointment) => {
        toast.success(t("createDialog.toasts.booked"));
        onOpenChange(false);
        onCreated?.(appointment);
      },
      onError: (error) => applyAppointmentServerErrors(form, error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field data-invalid={!!contactError || undefined}>
            <FieldLabel htmlFor="create-appointment-contact">
              {t("createDialog.contact")}
            </FieldLabel>
            <ContactCombobox
              id="create-appointment-contact"
              selected={selectedContact}
              invalid={!!contactError}
              requirePhone={false}
              onSelect={(contact) => {
                setSelectedContact(contact);
                form.setValue("contact_id", contact.id, { shouldValidate: true });
              }}
            />
            {contactError?.message && <FieldError>{contactError.message}</FieldError>}
          </Field>

          <Controller
            name="member_id"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="create-appointment-member">{t("assign.label")}</FieldLabel>
                <Select
                  items={assigneeItems}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange((value as string | null) ?? "");
                    clearSlot();
                  }}
                >
                  <SelectTrigger id="create-appointment-member" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="create-appointment-date">{tc("labels.date")}</FieldLabel>
                <DatePicker
                  id="create-appointment-date"
                  ref={field.ref}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    clearSlot();
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
            idPrefix="create-appointment"
            dateKey={form.watch("date")}
            memberId={form.watch("member_id")}
            slotIso={form.watch("slot_iso")}
            onSlotChange={(iso) => form.setValue("slot_iso", iso, { shouldValidate: true })}
            time={form.watch("time")}
            onTimeChange={(time) => form.setValue("time", time, { shouldValidate: true })}
            error={form.formState.errors.time?.message}
            initialMode={defaults?.time ? "custom" : "slots"}
          />

          <Field data-invalid={!!form.formState.errors.notes || undefined}>
            <FieldLabel htmlFor="create-appointment-notes">{tc("labels.notes")}</FieldLabel>
            <Textarea
              id="create-appointment-notes"
              {...form.register("notes")}
              placeholder={t("createDialog.notesPlaceholder")}
              rows={3}
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
            <Button type="submit" disabled={createAppointment.isPending}>
              {createAppointment.isPending ? t("createDialog.booking") : t("createDialog.book")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
