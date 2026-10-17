"use client";

import { useState } from "react";
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
  const markPaid = useMarkInvoicePaid(businessUuid);
  const [reference, setReference] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = reference.trim();
    markPaid.mutate(
      { id: invoice.id, ...(trimmed !== "" ? { payment_reference: trimmed } : {}) },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.number} marked as paid`);
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
          <DialogTitle>Mark invoice {invoice.number} as paid</DialogTitle>
          <DialogDescription>
            Records {formatCents(invoice.total_cents, invoice.currency)} from{" "}
            {invoice.contact?.name ?? "the customer"} as received.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="mark-paid-reference">Payment reference</FieldLabel>
            <Input
              id="mark-paid-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={200}
              placeholder="Bank transfer #88213"
            />
            <FieldDescription>Optional — how the payment arrived.</FieldDescription>
          </Field>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={markPaid.isPending}>
            <CheckIcon />
            {markPaid.isPending ? "Saving…" : "Mark as paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
