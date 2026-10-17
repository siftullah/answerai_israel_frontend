"use client";

import { Controller, useFieldArray, useForm, type FieldError as RhfFieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChipInput } from "@/components/ui/chip-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateContact, useUpdateContact } from "@/hooks/use-contacts";
import type { Contact, PhoneLabel } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  contactSchema,
  defaultContactEmail,
  defaultContactPhone,
  toContactPayload,
  toContactValues,
  type ContactValues,
} from "@/lib/validation/contact";

// Base UI's SelectValue renders the raw value unless the root knows the
// item labels — without this the trigger shows e.g. "none".
const LABEL_ITEMS: { value: "none" | PhoneLabel; label: string }[] = [
  { value: "none", label: "No label" },
  { value: "mobile", label: "Mobile" },
  { value: "work", label: "Work" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
];

const MAX_ROWS = 10;

/** Array-level errors (the exactly-one-primary rule) land on the array path;
 * with useFieldArray active they may sit on `.root` instead. */
function arrayError(error: unknown): string | undefined {
  const candidate = error as { message?: string; root?: RhfFieldError } | undefined;
  return candidate?.root?.message ?? candidate?.message;
}

/**
 * Single flat dialog (most contacts are a name and one phone). Mount
 * conditionally so the form initializes fresh per open; `source` null = create.
 */
export function ContactEditorDialog({
  open,
  onOpenChange,
  source,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Contact | null;
  onSaved?: (contact: Contact) => void;
}) {
  const { business } = useBusiness();
  const createContact = useCreateContact(business.id);
  const updateContact = useUpdateContact(business.id);
  const editing = source !== null;

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: toContactValues(source),
  });
  const { errors } = form.formState;

  const phones = useFieldArray({ control: form.control, name: "phones" });
  const emails = useFieldArray({ control: form.control, name: "emails" });

  // Exactly one primary per non-empty array: the radio rewrites the booleans,
  // and removing the primary row promotes the first remaining one.
  const setPrimary = (key: "phones" | "emails", index: number) => {
    form.getValues(key).forEach((_, rowIndex) => {
      form.setValue(`${key}.${rowIndex}.primary`, rowIndex === index, { shouldDirty: true });
    });
  };

  const removeRow = (key: "phones" | "emails", index: number) => {
    const wasPrimary = form.getValues(`${key}.${index}.primary`);
    (key === "phones" ? phones : emails).remove(index);
    if (wasPrimary && form.getValues(key).length > 0) {
      form.setValue(`${key}.0.primary`, true, { shouldDirty: true });
    }
  };

  const primaryIndex = (key: "phones" | "emails") => {
    const index = form.watch(key).findIndex((row) => row.primary);
    return index === -1 ? null : String(index);
  };

  const mutation = editing ? updateContact : createContact;

  const onSubmit = form.handleSubmit((values) => {
    const payload = toContactPayload(values);
    const options = {
      onSuccess: (contact: Contact) => {
        toast.success(editing ? "Contact saved" : "Contact added");
        onOpenChange(false);
        onSaved?.(contact);
      },
      onError: (error: Parameters<typeof applyServerErrors>[1]) =>
        applyServerErrors(form, error),
    };
    if (editing) {
      updateContact.mutate({ id: source.id, payload }, options);
    } else {
      createContact.mutate(payload, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(44rem,85dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
          <DialogDescription>
            A contact needs at least a name, a company or a phone number.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <FieldGroup className="gap-6">
              {errors.root?.server && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.root.server.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="contact-name">Name</FieldLabel>
                  <Input
                    id="contact-name"
                    placeholder="Jane Citizen"
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
                <Field data-invalid={!!errors.company || undefined}>
                  <FieldLabel htmlFor="contact-company">Company</FieldLabel>
                  <Input
                    id="contact-company"
                    placeholder="Acme Pty Ltd"
                    autoComplete="off"
                    aria-invalid={!!errors.company}
                    {...form.register("company")}
                  />
                  {errors.company && <FieldError>{errors.company.message}</FieldError>}
                </Field>
              </div>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Phone numbers</FieldLegend>
                {phones.fields.length > 0 && (
                  <RadioGroup
                    aria-label="Primary phone number"
                    className="flex w-full flex-col gap-2.5"
                    value={primaryIndex("phones")}
                    onValueChange={(value) => {
                      if (value !== null) setPrimary("phones", Number(value));
                    }}
                  >
                    {phones.fields.map((row, index) => {
                      const rowErrors = errors.phones?.[index];
                      return (
                        <div key={row.id} className="flex items-start gap-2">
                          <Field className="flex-1" data-invalid={!!rowErrors?.e164 || undefined}>
                            <FieldLabel className="sr-only" htmlFor={`contact-phone-${index}`}>
                              Phone number {index + 1}
                            </FieldLabel>
                            <Input
                              id={`contact-phone-${index}`}
                              type="tel"
                              placeholder="0412 345 678"
                              autoComplete="off"
                              aria-invalid={!!rowErrors?.e164}
                              {...form.register(`phones.${index}.e164`)}
                            />
                            {rowErrors?.e164 && (
                              <FieldError>{rowErrors.e164.message}</FieldError>
                            )}
                          </Field>
                          <Field className="w-24 shrink-0 sm:w-32">
                            <FieldLabel
                              className="sr-only"
                              htmlFor={`contact-phone-label-${index}`}
                            >
                              Phone number {index + 1} label
                            </FieldLabel>
                            <Controller
                              control={form.control}
                              name={`phones.${index}.label`}
                              render={({ field }) => (
                                <Select
                                  items={LABEL_ITEMS}
                                  value={field.value}
                                  onValueChange={(value) =>
                                    field.onChange(
                                      (value as "none" | PhoneLabel | null) ?? "none"
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    id={`contact-phone-label-${index}`}
                                    className="w-full"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LABEL_ITEMS.map((item) => (
                                      <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </Field>
                          <div className="flex h-9 shrink-0 items-center gap-1">
                            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors has-data-checked:text-foreground">
                              <RadioGroupItem
                                value={String(index)}
                                aria-label={`Make phone number ${index + 1} primary`}
                              />
                              <span className="max-sm:sr-only">Primary</span>
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Remove phone number"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeRow("phones", index)}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
                {arrayError(errors.phones) && (
                  <FieldError>{arrayError(errors.phones)}</FieldError>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={phones.fields.length >= MAX_ROWS}
                  className="w-full border-dashed border-cta/50 bg-cta/5 text-cta hover:bg-cta/10 hover:text-cta"
                  onClick={() => phones.append(defaultContactPhone(phones.fields.length === 0))}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add phone number
                </Button>
              </FieldSet>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Emails</FieldLegend>
                {emails.fields.length > 0 && (
                  <RadioGroup
                    aria-label="Primary email"
                    className="flex w-full flex-col gap-2.5"
                    value={primaryIndex("emails")}
                    onValueChange={(value) => {
                      if (value !== null) setPrimary("emails", Number(value));
                    }}
                  >
                    {emails.fields.map((row, index) => {
                      const rowErrors = errors.emails?.[index];
                      return (
                        <div key={row.id} className="flex items-start gap-2">
                          <Field className="flex-1" data-invalid={!!rowErrors?.email || undefined}>
                            <FieldLabel className="sr-only" htmlFor={`contact-email-${index}`}>
                              Email {index + 1}
                            </FieldLabel>
                            <Input
                              id={`contact-email-${index}`}
                              type="email"
                              placeholder="name@example.com"
                              autoComplete="off"
                              aria-invalid={!!rowErrors?.email}
                              {...form.register(`emails.${index}.email`)}
                            />
                            {rowErrors?.email && (
                              <FieldError>{rowErrors.email.message}</FieldError>
                            )}
                          </Field>
                          <Field className="w-24 shrink-0 sm:w-32">
                            <FieldLabel
                              className="sr-only"
                              htmlFor={`contact-email-label-${index}`}
                            >
                              Email {index + 1} label
                            </FieldLabel>
                            <Input
                              id={`contact-email-label-${index}`}
                              placeholder="Label"
                              autoComplete="off"
                              {...form.register(`emails.${index}.label`)}
                            />
                          </Field>
                          <div className="flex h-9 shrink-0 items-center gap-1">
                            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors has-data-checked:text-foreground">
                              <RadioGroupItem
                                value={String(index)}
                                aria-label={`Make email ${index + 1} primary`}
                              />
                              <span className="max-sm:sr-only">Primary</span>
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Remove email"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeRow("emails", index)}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
                {arrayError(errors.emails) && (
                  <FieldError>{arrayError(errors.emails)}</FieldError>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={emails.fields.length >= MAX_ROWS}
                  className="w-full border-dashed border-cta/50 bg-cta/5 text-cta hover:bg-cta/10 hover:text-cta"
                  onClick={() => emails.append(defaultContactEmail(emails.fields.length === 0))}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add email
                </Button>
              </FieldSet>

              <Field data-invalid={!!errors.address || undefined}>
                <FieldLabel htmlFor="contact-address">Address</FieldLabel>
                <Textarea
                  id="contact-address"
                  rows={2}
                  placeholder="123 Example St, Sydney NSW 2000"
                  autoComplete="off"
                  aria-invalid={!!errors.address}
                  {...form.register("address")}
                />
                {errors.address && <FieldError>{errors.address.message}</FieldError>}
              </Field>

              <Field data-invalid={!!arrayError(errors.tags) || undefined}>
                <FieldLabel htmlFor="contact-tags">Tags</FieldLabel>
                <Controller
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <ChipInput
                      id="contact-tags"
                      value={field.value}
                      onChange={field.onChange}
                      max={30}
                      maxItemLength={40}
                      placeholder="Type a tag and press Enter"
                      limitPlaceholder="Tag limit reached"
                      invalid={!!arrayError(errors.tags)}
                    />
                  )}
                />
                {arrayError(errors.tags) && <FieldError>{arrayError(errors.tags)}</FieldError>}
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {editing ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
