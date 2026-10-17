"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useBusiness } from "@/components/business/business-provider";
import { useCreateContact } from "@/hooks/use-contacts";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { normalizeAuPhone, optionalAuPhoneField } from "@/lib/phone";
import type { Contact } from "@/lib/api/types";

/**
 * The slim create path for pickers (quote/invoice customer combobox): name plus
 * optional email/phone, so raising a document for someone new never detours
 * through the Contacts page. The full editor stays the place for everything else.
 */
const quickCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the contact a name")
    .max(255, "Keep the name under 255 characters"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  phone: optionalAuPhoneField(),
});

type QuickCreateValues = z.infer<typeof quickCreateSchema>;

export function QuickCreateContactDialog({
  open,
  onOpenChange,
  onCreated,
  initialName = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: Contact) => void;
  /** Prefill from whatever was typed into the picker's search box. */
  initialName?: string;
}) {
  const { business } = useBusiness();
  const createContact = useCreateContact(business.id);

  const form = useForm<QuickCreateValues>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: { name: initialName, email: "", phone: "" },
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const onSubmit = form.handleSubmit((values) => {
    createContact.mutate(
      {
        name: values.name,
        phones: values.phone
          ? [{ e164: normalizeAuPhone(values.phone), primary: true }]
          : [],
        emails: values.email ? [{ email: values.email, primary: true }] : [],
        tags: [],
      },
      {
        onSuccess: (contact) => {
          toast.success(`Contact ${contact.name} created`);
          onCreated(contact);
          onOpenChange(false);
        },
        onError: (error) =>
          applyServerErrors(form, error, {
            // The backend validates array shapes; surface those on the flat fields.
            mapKey: (key) =>
              key.replace(/^phones\.0\.e164$/, "phone").replace(/^emails\.0\.email$/, "email"),
          }),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New contact</DialogTitle>
          <DialogDescription>
            Just enough to raise the document — add company, address and more from the Contacts
            page later.
          </DialogDescription>
        </DialogHeader>

        <form id="quick-create-contact" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.name || undefined}>
            <FieldLabel htmlFor="quick-contact-name">Name</FieldLabel>
            <Input
              id="quick-contact-name"
              {...form.register("name")}
              placeholder="Sam Taylor"
              aria-invalid={!!form.formState.errors.name}
              autoFocus
            />
            {form.formState.errors.name?.message && (
              <FieldError>{form.formState.errors.name.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.email || undefined}>
            <FieldLabel htmlFor="quick-contact-email">Email</FieldLabel>
            <Input
              id="quick-contact-email"
              type="email"
              {...form.register("email")}
              placeholder="sam@example.com"
              aria-invalid={!!form.formState.errors.email}
            />
            {form.formState.errors.email?.message ? (
              <FieldError>{form.formState.errors.email.message}</FieldError>
            ) : (
              <FieldDescription>Optional — where quotes and invoices get sent.</FieldDescription>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.phone || undefined}>
            <FieldLabel htmlFor="quick-contact-phone">Phone</FieldLabel>
            <Input
              id="quick-contact-phone"
              type="tel"
              {...form.register("phone")}
              placeholder="0412 345 678"
              aria-invalid={!!form.formState.errors.phone}
            />
            {form.formState.errors.phone?.message ? (
              <FieldError>{form.formState.errors.phone.message}</FieldError>
            ) : (
              <FieldDescription>Optional.</FieldDescription>
            )}
          </Field>

          {rootServerError?.message && (
            <Alert variant="destructive">
              <AlertDescription>{rootServerError.message}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="quick-create-contact" disabled={createContact.isPending}>
            {createContact.isPending ? "Creating…" : "Create contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
