"use client";

import { useRouter } from "next/navigation";
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
import { useConvertQuoteToInvoice } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/api/types";

/**
 * Accepted quote → draft invoice, then straight to the invoice so the user
 * can review and send it. The quoted rates carry over untouched.
 */
export function ConvertQuoteDialog({
  businessUuid,
  quote,
  onOpenChange,
}: {
  businessUuid: string;
  quote: Quote;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const convertQuote = useConvertQuoteToInvoice(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    convertQuote.mutate(quote.id, {
      onSuccess: (invoice) => {
        toast.success(`Invoice ${invoice.number} drafted from quote ${quote.number}`);
        router.push(`/b/${businessUuid}/invoices?invoice=${invoice.id}`);
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert quote {quote.number} to an invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Drafts an invoice for {formatCents(quote.total_cents, quote.currency)} with the same
            line items and tax rates, ready to review and send to{" "}
            {quote.contact?.name ?? "the customer"}. A quote converts once.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={convertQuote.isPending} onClick={confirm}>
            {convertQuote.isPending ? "Converting…" : "Create invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
