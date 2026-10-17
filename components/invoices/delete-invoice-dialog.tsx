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
import { useDeleteInvoice } from "@/hooks/use-invoices";
import type { Invoice } from "@/lib/api/types";

export function DeleteInvoiceDialog({
  businessUuid,
  invoice,
  onOpenChange,
  onDeleted,
}: {
  businessUuid: string;
  invoice: Invoice;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteInvoice = useDeleteInvoice(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteInvoice.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`Draft ${invoice.number} deleted`);
        onDeleted?.();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete draft {invoice.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            The draft and its line items are removed for good. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep draft</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteInvoice.isPending}
            onClick={confirm}
          >
            {deleteInvoice.isPending ? "Deleting…" : "Delete draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
