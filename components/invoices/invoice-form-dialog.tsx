"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ContactCombobox } from "@/components/callbacks/contact-combobox";
import { useBusiness } from "@/components/business/business-provider";
import {
  useCreateInvoice,
  useReplaceInvoiceItems,
  useUpdateInvoice,
} from "@/hooks/use-invoices";
import { useModuleSettings } from "@/hooks/use-modules";
import { useTaxDefaults } from "@/hooks/use-tax-defaults";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { dollarsToCents, formatCents } from "@/lib/money";
import {
  computeInvoiceTotals,
  defaultInvoiceValues,
  emptyInvoiceItem,
  invoiceFormSchema,
  invoiceToFormValues,
  toInvoiceItemsPayload,
  toStoreInvoicePayload,
  toUpdateInvoicePayload,
  type InvoiceFormValues,
} from "@/lib/validation/invoice";
import type {
  Contact,
  Invoice,
  InvoiceModuleSettings,
  LineItemKind,
} from "@/lib/api/types";
import { LINE_ITEM_KIND_LABELS, LINE_ITEM_KINDS } from "@/lib/api/types";

const FALLBACK_SETTINGS: InvoiceModuleSettings = {
  net_days: 14,
};

/** The combobox renders name/phones — enough of a Contact to show the pick. */
function contactStub(ref: { id: string; name: string }): Contact {
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
function mapItemErrorKey(key: string): string {
  return key.replace(/\.unit_price_cents$/, ".unit_price");
}

/** Built per render: the kind labels translate on access, so a module-level copy would freeze the locale. */
function buildKindOptions() {
  return LINE_ITEM_KINDS.map((kind) => ({
    value: kind,
    label: LINE_ITEM_KIND_LABELS[kind],
  }));
}

/** One row of the items grid; mobile stacks description first, then the numbers. */
const ROW_GRID =
  "md:grid md:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_7rem_3.25rem_5.5rem_1.75rem] md:items-start md:gap-2";

function InvoiceFormBody({
  invoice,
  settings,
  onOpenChange,
  onSaved,
}: {
  invoice?: Invoice;
  settings: InvoiceModuleSettings;
  onOpenChange: (open: boolean) => void;
  onSaved?: (invoice: Invoice) => void;
}) {
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const createInvoice = useCreateInvoice(business.id);
  const updateInvoice = useUpdateInvoice(business.id);
  const replaceItems = useReplaceInvoiceItems(business.id);
  const { taxRateBp, taxLabel } = useTaxDefaults(business.id);

  const editing = invoice !== undefined;

  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    invoice?.contact ? contactStub(invoice.contact) : null
  );

  const tv = useTranslations("validation");
  const schema = useMemo(() => invoiceFormSchema(tv), [tv]);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: invoice
      ? invoiceToFormValues(invoice)
      : {
          ...defaultInvoiceValues(),
          payment_instructions: settings.payment_instructions ?? "",
        },
  });
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const watchedItems = form.watch("items");
  const totals = computeInvoiceTotals(watchedItems, taxRateBp);
  const taxPercent = taxRateBp / 100;
  const kindOptions = buildKindOptions();

  const saving = createInvoice.isPending || updateInvoice.isPending || replaceItems.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (editing) {
      try {
        await updateInvoice.mutateAsync({ id: invoice.id, payload: toUpdateInvoicePayload(values) });
        const updated = await replaceItems.mutateAsync({
          id: invoice.id,
          items: toInvoiceItemsPayload(values.items),
        });
        toast.success(t("toasts.updated", { number: updated.number }));
        onOpenChange(false);
      } catch (error) {
        applyServerErrors(form, error as Parameters<typeof applyServerErrors>[1], {
          mapKey: mapItemErrorKey,
        });
      }
      return;
    }

    createInvoice.mutate(toStoreInvoicePayload(values), {
      onSuccess: (created) => {
        toast.success(t("toasts.draftCreated", { number: created.number }));
        onSaved?.(created);
        onOpenChange(false);
      },
      onError: (error) => applyServerErrors(form, error, { mapKey: mapItemErrorKey }),
    });
  });

  const itemErrors = form.formState.errors.items;

  return (
    <>
      <form
        id="invoice-form"
        onSubmit={onSubmit}
        noValidate
        className="scrollbar-slim -me-2 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pe-2"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="contact_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined} className="sm:col-span-2">
                <FieldLabel htmlFor="invoice-contact">{t("labels.customer")}</FieldLabel>
                <ContactCombobox
                  id="invoice-contact"
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

          <Controller
            name="issue_date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="invoice-issue-date">{t("form.issueDate")}</FieldLabel>
                <DatePicker
                  id="invoice-issue-date"
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                  placeholder={t("labels.setOnSend")}
                  invalid={!!fieldState.error}
                />
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            name="due_date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="invoice-due-date">{t("form.dueDate")}</FieldLabel>
                <DatePicker
                  id="invoice-due-date"
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                  placeholder={t("labels.setOnSend")}
                  invalid={!!fieldState.error}
                />
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : (
                  <FieldDescription>
                    {t("form.dueDateHint", { days: settings.net_days })}
                  </FieldDescription>
                )}
              </Field>
            )}
          />
        </div>

        {/* Line items */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("labels.lineItems")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => itemsArray.append(emptyInvoiceItem())}
            >
              <PlusIcon />
              {t("form.addLine")}
            </Button>
          </div>

          {/* Column labels (desktop) */}
          <div className={`hidden text-xs text-muted-foreground ${ROW_GRID}`}>
            <span>{t("labels.type")}</span>
            <span>{tc("labels.description")}</span>
            <span className="text-end">{t("labels.qty")}</span>
            <span className="text-end">{t("labels.unitPrice")}</span>
            <span className="text-center">{taxLabel}</span>
            <span className="text-end">{t("labels.amount")}</span>
            <span />
          </div>

          <div className="flex flex-col gap-3 md:gap-2">
            {itemsArray.fields.map((row, index) => {
              const rowErrors = itemErrors?.[index];
              const quantity = Number(watchedItems[index]?.quantity);
              const unitCents = dollarsToCents(watchedItems[index]?.unit_price ?? "");
              const amount =
                Number.isFinite(quantity) && quantity > 0 && unitCents !== null
                  ? Math.round(quantity * unitCents)
                  : null;

              return (
                <div
                  key={row.id}
                  className={`flex flex-col gap-2 rounded-xl border border-border p-3 md:rounded-none md:border-0 md:p-0 ${ROW_GRID}`}
                >
                  <div className="md:order-2">
                    <Input
                      {...form.register(`items.${index}.description`)}
                      placeholder={t("form.descriptionPlaceholder")}
                      aria-label={t("form.lineDescription", { line: index + 1 })}
                      aria-invalid={!!rowErrors?.description}
                    />
                    {rowErrors?.description?.message && (
                      <p className="mt-1 text-xs text-destructive">
                        {rowErrors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="md:order-1">
                    <Controller
                      name={`items.${index}.kind`}
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          items={kindOptions}
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange((value as LineItemKind | null) ?? "labour")
                          }
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-label={t("form.lineType", { line: index + 1 })}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {kindOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 md:contents">
                    <div className="w-20 md:order-3 md:w-auto">
                      <Input
                        {...form.register(`items.${index}.quantity`)}
                        inputMode="decimal"
                        className="text-end"
                        aria-label={t("form.lineQuantity", { line: index + 1 })}
                        aria-invalid={!!rowErrors?.quantity}
                      />
                      {rowErrors?.quantity?.message && (
                        <p className="mt-1 text-xs text-destructive">
                          {rowErrors.quantity.message}
                        </p>
                      )}
                    </div>

                    <div className="w-28 md:order-4 md:w-auto">
                      <Input
                        {...form.register(`items.${index}.unit_price`)}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="text-end"
                        aria-label={t("form.lineUnitPrice", { line: index + 1 })}
                        aria-invalid={!!rowErrors?.unit_price}
                      />
                      {rowErrors?.unit_price?.message && (
                        <p className="mt-1 text-xs text-destructive">
                          {rowErrors.unit_price.message}
                        </p>
                      )}
                    </div>

                    <Controller
                      name={`items.${index}.gst`}
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex h-9 items-center justify-center md:order-5">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                            aria-label={t("form.lineTax", { line: index + 1, tax: taxLabel })}
                          />
                          <span className="ms-1.5 text-xs text-muted-foreground md:hidden">
                            {taxLabel}
                          </span>
                        </div>
                      )}
                    />

                    <span className="ms-auto flex h-9 items-center text-sm font-medium tabular-nums md:order-6 md:ms-0 md:justify-end">
                      {amount !== null ? formatCents(amount) : "—"}
                    </span>

                    <div className="md:order-7">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        disabled={itemsArray.fields.length === 1}
                        onClick={() => itemsArray.remove(index)}
                        aria-label={t("form.removeLine", { line: index + 1 })}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {itemErrors?.root?.message && (
            <p className="text-xs text-destructive">{itemErrors.root.message}</p>
          )}
          {typeof itemErrors?.message === "string" && (
            <p className="text-xs text-destructive">{itemErrors.message}</p>
          )}
        </div>

        <Field data-invalid={!!form.formState.errors.notes || undefined}>
          <FieldLabel htmlFor="invoice-notes">{tc("labels.notes")}</FieldLabel>
          <Textarea
            id="invoice-notes"
            {...form.register("notes")}
            rows={2}
            placeholder={t("form.notesPlaceholder")}
            aria-invalid={!!form.formState.errors.notes}
          />
          {form.formState.errors.notes?.message && (
            <FieldError>{form.formState.errors.notes.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={!!form.formState.errors.payment_instructions || undefined}>
          <FieldLabel htmlFor="invoice-payment-instructions">
            {t("labels.paymentInstructions")}
          </FieldLabel>
          <Textarea
            id="invoice-payment-instructions"
            {...form.register("payment_instructions")}
            rows={2}
            placeholder={t("form.paymentInstructionsPlaceholder")}
            aria-invalid={!!form.formState.errors.payment_instructions}
          />
          {form.formState.errors.payment_instructions?.message && (
            <FieldError>{form.formState.errors.payment_instructions.message}</FieldError>
          )}
        </Field>
      </form>

      {/* Live totals — pinned under the scroll area so they're always visible */}
      <div className="flex justify-end border-t border-border pt-3">
        <dl className="flex w-64 flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{tc("labels.subtotal")}</dt>
            <dd className="tabular-nums">{formatCents(totals.subtotal_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {t("labels.taxLine", { label: taxLabel, rate: taxPercent })}
            </dt>
            <dd className="tabular-nums">{formatCents(totals.tax_cents)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>{tc("labels.total")}</dt>
            <dd className="tabular-nums">{formatCents(totals.total_cents)}</dd>
          </div>
        </dl>
      </div>

      {rootServerError?.message && (
        <Alert variant="destructive">
          <AlertDescription>{rootServerError.message}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tc("actions.cancel")}
        </Button>
        <Button type="submit" form="invoice-form" disabled={saving}>
          {saving
            ? tc("actions.saving")
            : editing
              ? tc("actions.saveChanges")
              : t("actions.createDraft")}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Create + edit-draft share this wide dialog. Module settings gate the body so
 * the form initializes with the business's real tax rate, terms, and default
 * payment instructions rather than re-rendering under the user.
 */
export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit that draft; absent = create. */
  invoice?: Invoice;
  onSaved?: (invoice: Invoice) => void;
}) {
  const t = useTranslations("invoices");
  const { business } = useBusiness();
  const settingsQuery = useModuleSettings<InvoiceModuleSettings>(business.id, "invoices");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {invoice ? t("form.editTitle", { number: invoice.number }) : t("newInvoice")}
          </DialogTitle>
          <DialogDescription>
            {invoice ? t("form.editDescription") : t("form.newDescription")}
          </DialogDescription>
        </DialogHeader>

        {settingsQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-5" />
          </div>
        ) : (
          <InvoiceFormBody
            invoice={invoice}
            settings={settingsQuery.data ?? FALLBACK_SETTINGS}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
