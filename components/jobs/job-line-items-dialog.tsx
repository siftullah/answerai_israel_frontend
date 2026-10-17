"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/components/business/business-provider";
import { useSaveJobLineItems } from "@/hooks/use-jobs";
import { dollarsToCents, formatCents } from "@/lib/money";
import {
  emptyJobLineItem,
  jobLineItemToFormValues,
  jobLineItemsSchema,
  toJobLineItemPayload,
  type JobLineItemsFormValues,
} from "@/lib/validation/job";
import type { Job, LineItemKind } from "@/lib/api/types";
import { LINE_ITEM_KINDS, LINE_ITEM_KIND_LABELS } from "@/lib/api/types";

const KIND_ITEMS = LINE_ITEM_KINDS.map((kind) => ({
  value: kind,
  label: LINE_ITEM_KIND_LABELS[kind],
}));

/** One row of the items grid; mobile stacks description first, then the numbers. */
const ROW_GRID =
  "md:grid md:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_7rem_5.5rem_1.75rem] md:items-start md:gap-2";

/**
 * Edits the job's costing rows. Saves as a diff against the per-item
 * endpoints (jobs have no PUT-replace) — the backend recomputes each amount
 * and the job's cached quote value on every write.
 */
export function JobLineItemsDialog({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}) {
  const { business } = useBusiness();
  const saveItems = useSaveJobLineItems(business.id);

  const original = job.line_items ?? [];

  const form = useForm<JobLineItemsFormValues>({
    resolver: zodResolver(jobLineItemsSchema),
    defaultValues: {
      items: original.length > 0 ? original.map(jobLineItemToFormValues) : [emptyJobLineItem()],
    },
  });
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");

  const total = watchedItems.reduce((sum, row) => {
    const quantity = Number(row.quantity);
    const unitCents = dollarsToCents(row.unit_price ?? "");
    if (!Number.isFinite(quantity) || quantity <= 0 || unitCents === null) return sum;
    return sum + Math.round(quantity * unitCents);
  }, 0);

  const onSubmit = form.handleSubmit((values) => {
    const keptIds = new Set(values.items.map((row) => row.itemId).filter(Boolean));

    saveItems.mutate(
      {
        jobId: job.id,
        deletes: original.filter((item) => !keptIds.has(item.id)).map((item) => item.id),
        updates: values.items
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.itemId !== undefined)
          .map(({ row, index }) => ({
            id: row.itemId as string,
            payload: toJobLineItemPayload(row, index),
          })),
        creates: values.items
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.itemId === undefined)
          .map(({ row, index }) => toJobLineItemPayload(row, index)),
      },
      {
        onSuccess: () => {
          toast.success("Line items saved");
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  });

  const itemErrors = form.formState.errors.items;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Line items — {job.reference}</DialogTitle>
          <DialogDescription>
            Labour and materials for this job. GST is applied when it&apos;s invoiced.
          </DialogDescription>
        </DialogHeader>

        <form
          id="job-line-items-form"
          onSubmit={onSubmit}
          noValidate
          className="scrollbar-slim -mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2"
        >
          {/* Column labels (desktop) */}
          <div className={`hidden text-xs text-muted-foreground ${ROW_GRID}`}>
            <span>Type</span>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
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
                      placeholder="What will be done or supplied"
                      aria-label={`Line ${index + 1} description`}
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
                          items={KIND_ITEMS}
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange((value as LineItemKind | null) ?? "labour")
                          }
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-label={`Line ${index + 1} type`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KIND_ITEMS.map((item) => (
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
                        className="text-right"
                        aria-label={`Line ${index + 1} quantity`}
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
                        className="text-right"
                        aria-label={`Line ${index + 1} unit price in dollars`}
                        aria-invalid={!!rowErrors?.unit_price}
                      />
                      {rowErrors?.unit_price?.message && (
                        <p className="mt-1 text-xs text-destructive">
                          {rowErrors.unit_price.message}
                        </p>
                      )}
                    </div>

                    <span className="ml-auto flex h-9 items-center text-sm font-medium tabular-nums md:order-5 md:ml-0 md:justify-end">
                      {amount !== null ? formatCents(amount) : "—"}
                    </span>

                    <div className="md:order-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        disabled={itemsArray.fields.length === 1}
                        onClick={() => itemsArray.remove(index)}
                        aria-label={`Remove line ${index + 1}`}
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

          <div className="flex justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => itemsArray.append(emptyJobLineItem())}
            >
              <PlusIcon />
              Add line
            </Button>
          </div>
        </form>

        <div className="flex justify-end border-t border-border pt-3">
          <dl className="flex w-56 flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-base font-semibold">
              <dt>Total (ex. tax)</dt>
              <dd className="tabular-nums">{formatCents(total, job.currency ?? "AUD")}</dd>
            </div>
          </dl>
        </div>

        {saveItems.isError && (
          <Alert variant="destructive">
            <AlertDescription>{saveItems.error.message}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="job-line-items-form" disabled={saveItems.isPending}>
            {saveItems.isPending ? "Saving…" : "Save items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
