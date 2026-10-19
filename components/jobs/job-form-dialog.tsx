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
import { useCreateJob, useUpdateJob } from "@/hooks/use-jobs";
import { useMembers } from "@/hooks/use-members";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  defaultJobValues,
  jobFormSchema,
  jobToFormValues,
  toStoreJobPayload,
  toUpdateJobPayload,
  type JobFormValues,
} from "@/lib/validation/job";
import type { Contact, Job, JobPriority } from "@/lib/api/types";
import { JOB_PRIORITIES, JOB_PRIORITY_LABELS } from "@/lib/api/types";

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

/** Backend bag keys use the nested service_address shape; the form is flat. */
function mapJobErrorKey(key: string): string {
  return key.startsWith("service_address.") ? key.replace("service_address.", "address_") : key;
}

/**
 * Create + edit share this dialog. `details` only exists on create — it seeds
 * the first timeline note; edits add notes through the timeline instead.
 * Pricing lives in the line-items editor, not here.
 */
export function JobFormDialog({
  open,
  onOpenChange,
  job,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit that job; absent = create. */
  job?: Job;
  onSaved?: (job: Job) => void;
}) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const createJob = useCreateJob(business.id);
  const updateJob = useUpdateJob(business.id);
  const membersQuery = useMembers(business.id);

  const editing = job !== undefined;

  // Built per render so the labels follow the active locale.
  const priorityItems = JOB_PRIORITIES.map((priority) => ({
    value: priority,
    label: JOB_PRIORITY_LABELS[priority],
  }));

  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    job?.contact ? contactStub(job.contact) : null
  );

  const tv = useTranslations("validation");
  const schema = useMemo(() => jobFormSchema(tv), [tv]);
  const form = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: job ? jobToFormValues(job) : defaultJobValues(),
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const assigneeItems = [
    { value: "", label: t("fields.unassigned") },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const saving = createJob.isPending || updateJob.isPending;

  const onSubmit = form.handleSubmit((values) => {
    if (editing) {
      updateJob.mutate(
        { id: job.id, payload: toUpdateJobPayload(values) },
        {
          onSuccess: (updated) => {
            toast.success(t("toasts.updated"));
            onSaved?.(updated);
            onOpenChange(false);
          },
          onError: (error) => applyServerErrors(form, error, { mapKey: mapJobErrorKey }),
        }
      );
      return;
    }

    createJob.mutate(toStoreJobPayload(values), {
      onSuccess: (created) => {
        toast.success(t("toasts.added", { reference: created.reference }));
        onSaved?.(created);
        onOpenChange(false);
      },
      onError: (error) => applyServerErrors(form, error, { mapKey: mapJobErrorKey }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("form.editTitle", { reference: job.reference }) : t("page.newJob")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("form.editDescription") : t("form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          id="job-form"
          onSubmit={onSubmit}
          noValidate
          className="scrollbar-slim -me-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pe-2"
        >
          <Field data-invalid={!!form.formState.errors.title || undefined}>
            <FieldLabel htmlFor="job-title">{t("form.title")}</FieldLabel>
            <Input
              id="job-title"
              {...form.register("title")}
              placeholder={t("form.titlePlaceholder")}
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
                <FieldLabel htmlFor="job-contact">{t("fields.customer")}</FieldLabel>
                <ContactCombobox
                  id="job-contact"
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
            <Controller
              name="priority"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="job-priority">{t("fields.priority")}</FieldLabel>
                  <Select
                    items={priorityItems}
                    value={field.value}
                    onValueChange={(next) => field.onChange((next as JobPriority | null) ?? "normal")}
                  >
                    <SelectTrigger id="job-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityItems.map((item) => (
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
              name="assignee_user_id"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error || undefined}>
                  <FieldLabel htmlFor="job-assignee">{t("fields.assignee")}</FieldLabel>
                  <Select
                    items={assigneeItems}
                    value={field.value}
                    onValueChange={(next) => field.onChange((next as string | null) ?? "")}
                  >
                    <SelectTrigger id="job-assignee" className="w-full">
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
          </div>

          <Field data-invalid={!!form.formState.errors.estimated_minutes || undefined}>
            <FieldLabel htmlFor="job-estimated-minutes">{t("form.estimatedMinutes")}</FieldLabel>
            <Input
              id="job-estimated-minutes"
              {...form.register("estimated_minutes")}
              inputMode="numeric"
              placeholder="60"
              className="max-w-28"
              aria-invalid={!!form.formState.errors.estimated_minutes}
            />
            {form.formState.errors.estimated_minutes?.message ? (
              <FieldError>{form.formState.errors.estimated_minutes.message}</FieldError>
            ) : (
              <FieldDescription>{t("form.estimatedMinutesHint")}</FieldDescription>
            )}
          </Field>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">{t("fields.siteAddress")}</span>
            <Field data-invalid={!!form.formState.errors.address_line1 || undefined}>
              <FieldLabel htmlFor="job-address-line1" className="sr-only">
                {t("form.streetAddress")}
              </FieldLabel>
              <Input
                id="job-address-line1"
                {...form.register("address_line1")}
                placeholder={t("form.streetAddress")}
                aria-invalid={!!form.formState.errors.address_line1}
              />
              {form.formState.errors.address_line1?.message && (
                <FieldError>{form.formState.errors.address_line1.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="job-address-line2" className="sr-only">
                {t("form.unitLabel")}
              </FieldLabel>
              <Input
                id="job-address-line2"
                {...form.register("address_line2")}
                placeholder={t("form.unitPlaceholder")}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field data-invalid={!!form.formState.errors.address_city || undefined}>
                <FieldLabel htmlFor="job-address-city" className="sr-only">
                  {t("form.suburb")}
                </FieldLabel>
                <Input
                  id="job-address-city"
                  {...form.register("address_city")}
                  placeholder={t("form.suburb")}
                  aria-invalid={!!form.formState.errors.address_city}
                />
                {form.formState.errors.address_city?.message && (
                  <FieldError>{form.formState.errors.address_city.message}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="job-address-region" className="sr-only">
                  {t("form.state")}
                </FieldLabel>
                <Input
                  id="job-address-region"
                  {...form.register("address_region")}
                  placeholder={t("form.state")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="job-address-postal-code" className="sr-only">
                  {t("form.postcode")}
                </FieldLabel>
                <Input
                  id="job-address-postal-code"
                  {...form.register("address_postal_code")}
                  placeholder={t("form.postcode")}
                />
              </Field>
            </div>
          </div>

          <Field data-invalid={!!form.formState.errors.description || undefined}>
            <FieldLabel htmlFor="job-description">{tc("labels.description")}</FieldLabel>
            <Textarea
              id="job-description"
              {...form.register("description")}
              rows={3}
              placeholder={t("form.descriptionPlaceholder")}
              aria-invalid={!!form.formState.errors.description}
            />
            {form.formState.errors.description?.message && (
              <FieldError>{form.formState.errors.description.message}</FieldError>
            )}
          </Field>

          {!editing && (
            <Field data-invalid={!!form.formState.errors.details || undefined}>
              <FieldLabel htmlFor="job-details">{tc("labels.notes")}</FieldLabel>
              <Textarea
                id="job-details"
                {...form.register("details")}
                rows={3}
                placeholder={t("form.notesPlaceholder")}
                aria-invalid={!!form.formState.errors.details}
              />
              {form.formState.errors.details?.message ? (
                <FieldError>{form.formState.errors.details.message}</FieldError>
              ) : (
                <FieldDescription>{t("form.notesHint")}</FieldDescription>
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
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" form="job-form" disabled={saving}>
            {saving
              ? tc("actions.saving")
              : editing
                ? tc("actions.saveChanges")
                : t("form.submitCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
