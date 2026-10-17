"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContactCombobox } from "@/components/callbacks/contact-combobox";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateLead, useUpdateLead } from "@/hooks/use-leads";
import { useMembers } from "@/hooks/use-members";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  defaultLeadValues,
  leadFormSchema,
  leadToFormValues,
  toStoreLeadPayload,
  toUpdateLeadPayload,
  type LeadFormValues,
} from "@/lib/validation/lead";
import type { Contact, Lead } from "@/lib/api/types";

/** The combobox renders name/phones — enough of a Contact to show the pick. */
function contactStub(ref: { id: string; name: string | null }): Contact {
  return {
    id: ref.id,
    name: ref.name,
    company: null,
    phones: [],
    emails: [],
    address: null,
    tags: [],
    source: "manual",
    last_call_at: null,
    on_dnc: false,
    created_at: "",
    updated_at: "",
  };
}

/** Backend bag keys use cents; the form field is the dollars input. */
function mapLeadErrorKey(key: string): string {
  return key === "value_cents" ? "value" : key;
}

/**
 * Create + edit share this dialog. `details` only exists on create — it seeds
 * the first timeline note; edits add notes through the timeline instead.
 */
export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit that lead; absent = create. */
  lead?: Lead;
  onSaved?: (lead: Lead) => void;
}) {
  const { business } = useBusiness();
  const createLead = useCreateLead(business.id);
  const updateLead = useUpdateLead(business.id);
  const membersQuery = useMembers(business.id);

  const editing = lead !== undefined;

  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    lead?.contact ? contactStub(lead.contact) : null
  );

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: lead ? leadToFormValues(lead) : defaultLeadValues(),
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const assigneeItems = [
    { value: "", label: "Unassigned" },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const saving = createLead.isPending || updateLead.isPending;

  const onSubmit = form.handleSubmit((values) => {
    if (editing) {
      updateLead.mutate(
        { id: lead.id, payload: toUpdateLeadPayload(values) },
        {
          onSuccess: (updated) => {
            toast.success("Lead updated");
            onSaved?.(updated);
            onOpenChange(false);
          },
          onError: (error) => applyServerErrors(form, error, { mapKey: mapLeadErrorKey }),
        }
      );
      return;
    }

    createLead.mutate(toStoreLeadPayload(values), {
      onSuccess: (created) => {
        toast.success("Lead added");
        onSaved?.(created);
        onOpenChange(false);
      },
      onError: (error) => applyServerErrors(form, error, { mapKey: mapLeadErrorKey }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lead" : "New lead"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details — status changes happen from the lead's actions."
              : "Log a sales enquiry for the team to follow up."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="lead-form"
          onSubmit={onSubmit}
          noValidate
          className="scrollbar-slim -mr-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2"
        >
          <Field data-invalid={!!form.formState.errors.title || undefined}>
            <FieldLabel htmlFor="lead-title">Title</FieldLabel>
            <Input
              id="lead-title"
              {...form.register("title")}
              placeholder="What they're after, e.g. Kitchen rewire"
              aria-invalid={!!form.formState.errors.title}
            />
            {form.formState.errors.title?.message && (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            )}
          </Field>

          <Controller
            name="contact_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="lead-contact">Contact</FieldLabel>
                <ContactCombobox
                  id="lead-contact"
                  selected={selectedContact}
                  requirePhone={false}
                  allowCreate
                  invalid={!!fieldState.error}
                  onSelect={(contact) => {
                    setSelectedContact(contact);
                    field.onChange(contact.id);
                  }}
                />
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!form.formState.errors.value || undefined}>
              <FieldLabel htmlFor="lead-value">Estimated value</FieldLabel>
              <Input
                id="lead-value"
                {...form.register("value")}
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={!!form.formState.errors.value}
              />
              {form.formState.errors.value?.message ? (
                <FieldError>{form.formState.errors.value.message}</FieldError>
              ) : (
                <FieldDescription>Rough worth of the work, in dollars.</FieldDescription>
              )}
            </Field>

            <Controller
              name="expected_close_date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error || undefined}>
                  <FieldLabel htmlFor="lead-expected-close">Expected close</FieldLabel>
                  <DatePicker
                    id="lead-expected-close"
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    clearable
                    placeholder="No target date"
                    invalid={!!fieldState.error}
                  />
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            name="assignee_user_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="lead-assignee">Assignee</FieldLabel>
                <Select
                  items={assigneeItems}
                  value={field.value}
                  onValueChange={(next) => field.onChange((next as string | null) ?? "")}
                >
                  <SelectTrigger id="lead-assignee" className="w-full">
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
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {!editing && (
            <Field data-invalid={!!form.formState.errors.details || undefined}>
              <FieldLabel htmlFor="lead-details">Notes</FieldLabel>
              <Textarea
                id="lead-details"
                {...form.register("details")}
                rows={3}
                placeholder="What they asked for, budget, timing… (optional)"
                aria-invalid={!!form.formState.errors.details}
              />
              {form.formState.errors.details?.message ? (
                <FieldError>{form.formState.errors.details.message}</FieldError>
              ) : (
                <FieldDescription>Starts the lead&apos;s activity timeline.</FieldDescription>
              )}
            </Field>
          )}
        </form>

        {rootServerError?.message && (
          <Alert variant="destructive">
            <AlertDescription>{rootServerError.message}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="lead-form" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
