"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVoidInvoice } from "@/hooks/use-invoices";
import { formatCents } from "@/lib/money";
import type { Invoice } from "@/lib/api/types";

export function VoidInvoiceDialog({
  businessUuid,
  invoice,
  onOpenChange,
}: {
  businessUuid: string;
  invoice: Invoice;
  onOpenChange: (open: boolean) => void;
}) {
  const voidInvoice = useVoidInvoice(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    voidInvoice.mutate(invoice.id, {
      onSuccess: () => toast.success(`Invoice ${invoice.number} voided`),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void invoice {invoice.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            The {formatCents(invoice.total_cents, invoice.currency)} owed by{" "}
            {invoice.contact?.name ?? "the customer"} stops counting as outstanding. The invoice
            stays on record but can&apos;t be reopened.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep invoice</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={voidInvoice.isPending}
            onClick={confirm}
          >
            {voidInvoice.isPending ? "Voiding…" : "Void invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
