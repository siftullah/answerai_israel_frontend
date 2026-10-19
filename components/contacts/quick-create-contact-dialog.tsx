"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
import type { Translator } from "@/lib/i18n/types";

/**
 * The slim create path for pickers (quote/invoice customer combobox): name plus
 * optional email/phone, so raising a document for someone new never detours
 * through the Contacts page. The full editor stays the place for everything else.
 * `tv` is a translator scoped to the `validation` namespace; `nameRequired` is
 * the dialog's own copy for an empty name.
 */
function quickCreateSchema(tv: Translator, nameRequired: string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, nameRequired)
      .max(255, tv("length.name", { max: 255 })),
    email: z.union([z.literal(""), z.email(tv("common.emailInvalid"))]),
    phone: optionalAuPhoneField(tv),
  });
}

type QuickCreateValues = z.infer<ReturnType<typeof quickCreateSchema>>;

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
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const createContact = useCreateContact(business.id);

  const tv = useTranslations("validation");
  const nameRequired = t("quickCreate.nameRequired");
  const schema = useMemo(() => quickCreateSchema(tv, nameRequired), [tv, nameRequired]);
  const form = useForm<QuickCreateValues>({
    resolver: zodResolver(schema),
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
          toast.success(t("quickCreate.created", { name: contact.name ?? "" }));
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
          <DialogTitle>{t("quickCreate.title")}</DialogTitle>
          <DialogDescription>{t("quickCreate.description")}</DialogDescription>
        </DialogHeader>

        <form id="quick-create-contact" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.name || undefined}>
            <FieldLabel htmlFor="quick-contact-name">{tc("labels.name")}</FieldLabel>
            <Input
              id="quick-contact-name"
              {...form.register("name")}
              placeholder={t("quickCreate.namePlaceholder")}
              aria-invalid={!!form.formState.errors.name}
              autoFocus
            />
            {form.formState.errors.name?.message && (
              <FieldError>{form.formState.errors.name.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.email || undefined}>
            <FieldLabel htmlFor="quick-contact-email">{tc("labels.email")}</FieldLabel>
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
              <FieldDescription>{t("quickCreate.emailHint")}</FieldDescription>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.phone || undefined}>
            <FieldLabel htmlFor="quick-contact-phone">{tc("labels.phone")}</FieldLabel>
            <Input
              id="quick-contact-phone"
              type="tel"
              {...form.register("phone")}
              placeholder={t("phonePlaceholder")}
              aria-invalid={!!form.formState.errors.phone}
            />
            {form.formState.errors.phone?.message ? (
              <FieldError>{form.formState.errors.phone.message}</FieldError>
            ) : (
              <FieldDescription>{t("quickCreate.phoneHint")}</FieldDescription>
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
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" form="quick-create-contact" disabled={createContact.isPending}>
            {createContact.isPending ? t("quickCreate.creating") : t("quickCreate.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
