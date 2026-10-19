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
import { useCreateQuote, useReplaceQuoteItems, useUpdateQuote } from "@/hooks/use-quotes";
import { useModuleSettings } from "@/hooks/use-modules";
import { useTaxDefaults } from "@/hooks/use-tax-defaults";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { dollarsToCents, formatCents } from "@/lib/money";
import {
  computeQuoteTotals,
  defaultQuoteValues,
  emptyQuoteItem,
  quoteFormSchema,
  quoteToFormValues,
  toQuoteItemsPayload,
  toStoreQuotePayload,
  toUpdateQuotePayload,
  type QuoteFormValues,
} from "@/lib/validation/quote";
import type { Contact, LineItemKind, Quote, QuoteModuleSettings } from "@/lib/api/types";
import { LINE_ITEM_KIND_LABELS, LINE_ITEM_KINDS } from "@/lib/api/types";

const FALLBACK_SETTINGS: QuoteModuleSettings = {
  valid_days: 30,
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

function QuoteFormBody({
  quote,
  settings,
  onOpenChange,
  onSaved,
}: {
  quote?: Quote;
  settings: QuoteModuleSettings;
  onOpenChange: (open: boolean) => void;
  onSaved?: (quote: Quote) => void;
}) {
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const createQuote = useCreateQuote(business.id);
  const updateQuote = useUpdateQuote(business.id);
  const replaceItems = useReplaceQuoteItems(business.id);
  const { taxRateBp, taxLabel } = useTaxDefaults(business.id);

  const editing = quote !== undefined;

  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    quote?.contact ? contactStub(quote.contact) : null
  );

  const tv = useTranslations("validation");
  const schema = useMemo(() => quoteFormSchema(tv), [tv]);
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: quote
      ? quoteToFormValues(quote)
      : {
          ...defaultQuoteValues(),
          terms: settings.terms ?? "",
        },
  });
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const watchedItems = form.watch("items");
  const depositType = form.watch("deposit_type");
  const depositValue = form.watch("deposit_value");
  const totals = computeQuoteTotals(watchedItems, taxRateBp, depositType, depositValue);
  const taxPercent = taxRateBp / 100;
  const kindOptions = buildKindOptions();
  const depositOptions: { value: QuoteFormValues["deposit_type"]; label: string }[] = [
    { value: "none", label: t("form.deposit.none") },
    { value: "percent", label: t("form.deposit.percent") },
    { value: "fixed", label: t("form.deposit.fixed") },
  ];

  const saving = createQuote.isPending || updateQuote.isPending || replaceItems.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (editing) {
      try {
        await updateQuote.mutateAsync({ id: quote.id, payload: toUpdateQuotePayload(values) });
        const updated = await replaceItems.mutateAsync({
          id: quote.id,
          items: toQuoteItemsPayload(values.items),
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

    createQuote.mutate(toStoreQuotePayload(values), {
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
        id="quote-form"
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
                <FieldLabel htmlFor="quote-contact">{t("labels.customer")}</FieldLabel>
                <ContactCombobox
                  id="quote-contact"
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

          <Field
            data-invalid={!!form.formState.errors.title || undefined}
            className="sm:col-span-2"
          >
            <FieldLabel htmlFor="quote-title">{t("form.title")}</FieldLabel>
            <Input
              id="quote-title"
              {...form.register("title")}
              placeholder={t("form.titlePlaceholder")}
              aria-invalid={!!form.formState.errors.title}
            />
            {form.formState.errors.title?.message && (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            )}
          </Field>

          <Controller
            name="issue_date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="quote-issue-date">{t("form.issueDate")}</FieldLabel>
                <DatePicker
                  id="quote-issue-date"
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
            name="valid_until"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor="quote-valid-until">{t("labels.validUntil")}</FieldLabel>
                <DatePicker
                  id="quote-valid-until"
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
                    {t("form.validUntilHint", { days: settings.valid_days })}
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
              onClick={() => itemsArray.append(emptyQuoteItem())}
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

        {/* Deposit */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="deposit_type"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="quote-deposit-type">{t("labels.deposit")}</FieldLabel>
                <Select
                  items={depositOptions}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange((value as QuoteFormValues["deposit_type"] | null) ?? "none");
                    form.setValue("deposit_value", "");
                    form.clearErrors("deposit_value");
                  }}
                >
                  <SelectTrigger id="quote-deposit-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {depositOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {depositType !== "none" && (
            <Field data-invalid={!!form.formState.errors.deposit_value || undefined}>
              <FieldLabel htmlFor="quote-deposit-value">
                {depositType === "percent"
                  ? t("form.deposit.percentLabel")
                  : t("form.deposit.amountLabel")}
              </FieldLabel>
              <Input
                id="quote-deposit-value"
                {...form.register("deposit_value")}
                inputMode="decimal"
                placeholder={depositType === "percent" ? "20" : "250.00"}
                aria-invalid={!!form.formState.errors.deposit_value}
              />
              {form.formState.errors.deposit_value?.message ? (
                <FieldError>{form.formState.errors.deposit_value.message}</FieldError>
              ) : (
                <FieldDescription>
                  {depositType === "percent"
                    ? t("form.deposit.percentHint")
                    : t("form.deposit.amountHint")}
                </FieldDescription>
              )}
            </Field>
          )}
        </div>

        <Field data-invalid={!!form.formState.errors.notes || undefined}>
          <FieldLabel htmlFor="quote-notes">{tc("labels.notes")}</FieldLabel>
          <Textarea
            id="quote-notes"
            {...form.register("notes")}
            rows={2}
            placeholder={t("form.notesPlaceholder")}
            aria-invalid={!!form.formState.errors.notes}
          />
          {form.formState.errors.notes?.message && (
            <FieldError>{form.formState.errors.notes.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={!!form.formState.errors.terms || undefined}>
          <FieldLabel htmlFor="quote-terms">{t("labels.terms")}</FieldLabel>
          <Textarea
            id="quote-terms"
            {...form.register("terms")}
            rows={3}
            placeholder={t("form.termsPlaceholder")}
            aria-invalid={!!form.formState.errors.terms}
          />
          {form.formState.errors.terms?.message && (
            <FieldError>{form.formState.errors.terms.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={!!form.formState.errors.internal_notes || undefined}>
          <FieldLabel htmlFor="quote-internal-notes">{t("labels.internalNotes")}</FieldLabel>
          <Textarea
            id="quote-internal-notes"
            {...form.register("internal_notes")}
            rows={2}
            placeholder={t("form.internalNotesPlaceholder")}
            aria-invalid={!!form.formState.errors.internal_notes}
          />
          {form.formState.errors.internal_notes?.message && (
            <FieldError>{form.formState.errors.internal_notes.message}</FieldError>
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
          {totals.deposit_cents > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>{t("form.deposit.toCommence")}</dt>
              <dd className="tabular-nums">{formatCents(totals.deposit_cents)}</dd>
            </div>
          )}
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
        <Button type="submit" form="quote-form" disabled={saving}>
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
 * the form initializes with the business's default terms and validity window
 * rather than re-rendering under the user.
 */
export function QuoteFormDialog({
  open,
  onOpenChange,
  quote,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit that draft; absent = create. */
  quote?: Quote;
  onSaved?: (quote: Quote) => void;
}) {
  const t = useTranslations("quotes");
  const { business } = useBusiness();
  const settingsQuery = useModuleSettings<QuoteModuleSettings>(business.id, "quotes");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {quote ? t("form.editTitle", { number: quote.number }) : t("newQuote")}
          </DialogTitle>
          <DialogDescription>
            {quote ? t("form.editDescription") : t("form.newDescription")}
          </DialogDescription>
        </DialogHeader>

        {settingsQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-5" />
          </div>
        ) : (
          <QuoteFormBody
            quote={quote}
            settings={settingsQuery.data ?? FALLBACK_SETTINGS}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
