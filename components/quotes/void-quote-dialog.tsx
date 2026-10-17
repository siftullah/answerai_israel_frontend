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
import { useVoidQuote } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/api/types";

export function VoidQuoteDialog({
  businessUuid,
  quote,
  onOpenChange,
}: {
  businessUuid: string;
  quote: Quote;
  onOpenChange: (open: boolean) => void;
}) {
  const voidQuote = useVoidQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    voidQuote.mutate(quote.id, {
      onSuccess: () => toast.success(`Quote ${quote.number} voided`),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void quote {quote.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            Withdraws the {formatCents(quote.total_cents, quote.currency)} quote for{" "}
            {quote.contact?.name ?? "the customer"} — their link stops accepting. The quote stays
            on record but can&apos;t be reopened.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep quote</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={voidQuote.isPending}
            onClick={confirm}
          >
            {voidQuote.isPending ? "Voiding…" : "Void quote"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
