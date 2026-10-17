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
import { useAcceptQuote } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/api/types";

/** Manual acceptance — the customer said yes by phone or in person. */
export function AcceptQuoteDialog({
  businessUuid,
  quote,
  onOpenChange,
}: {
  businessUuid: string;
  quote: Quote;
  onOpenChange: (open: boolean) => void;
}) {
  const acceptQuote = useAcceptQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    acceptQuote.mutate(quote.id, {
      onSuccess: () => toast.success(`Quote ${quote.number} accepted`),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark quote {quote.number} as accepted?</AlertDialogTitle>
          <AlertDialogDescription>
            Records that {quote.contact?.name ?? "the customer"} accepted the{" "}
            {formatCents(quote.total_cents, quote.currency)} quote
            {quote.status === "expired" ? " (even though it had expired)" : ""}. You can then
            convert it to an invoice.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={acceptQuote.isPending} onClick={confirm}>
            {acceptQuote.isPending ? "Saving…" : "Mark as accepted"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
