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
import { useDeleteQuote } from "@/hooks/use-quotes";
import type { Quote } from "@/lib/api/types";

export function DeleteQuoteDialog({
  businessUuid,
  quote,
  onOpenChange,
  onDeleted,
}: {
  businessUuid: string;
  quote: Quote;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteQuote = useDeleteQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteQuote.mutate(quote.id, {
      onSuccess: () => {
        toast.success(`Draft ${quote.number} deleted`);
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
          <AlertDialogTitle>Delete draft {quote.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            The draft and its line items are removed for good. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep draft</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteQuote.isPending}
            onClick={confirm}
          >
            {deleteQuote.isPending ? "Deleting…" : "Delete draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
