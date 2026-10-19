"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMarkInvoicePaid } from "@/hooks/use-invoices";
import { formatCents } from "@/lib/money";
import type { Invoice } from "@/lib/api/types";

export function MarkInvoicePaidDialog({
  open,
  onOpenChange,
  businessUuid,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUuid: string;
  invoice: Invoice;
}) {
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
  const markPaid = useMarkInvoicePaid(businessUuid);
  const [reference, setReference] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = reference.trim();
    markPaid.mutate(
      { id: invoice.id, ...(trimmed !== "" ? { payment_reference: trimmed } : {}) },
      {
        onSuccess: () => {
          toast.success(t("toasts.markedPaid", { number: invoice.number }));
          onOpenChange(false);
        },
        onError: (error) => setServerError(error.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("markPaidDialog.title", { number: invoice.number })}</DialogTitle>
          <DialogDescription>
            {t("markPaidDialog.description", {
              amount: formatCents(invoice.total_cents, invoice.currency),
              customer: invoice.contact?.name ?? t("theCustomer"),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="mark-paid-reference">
              {t("markPaidDialog.referenceLabel")}
            </FieldLabel>
            <Input
              id="mark-paid-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={200}
              placeholder={t("markPaidDialog.referencePlaceholder")}
            />
            <FieldDescription>{t("markPaidDialog.referenceHint")}</FieldDescription>
          </Field>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={markPaid.isPending}>
            <CheckIcon />
            {markPaid.isPending ? tc("actions.saving") : t("actions.markPaid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
