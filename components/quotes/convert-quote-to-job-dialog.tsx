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
import { useCreateJobFromQuote } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/api/types";

/**
 * Accepted quote → job, then straight to the job so the user can schedule the
 * visit. Line items copy across at the agreed ex-tax amounts; the source lead
 * (when there is one) carries over and is marked won.
 */
export function ConvertQuoteToJobDialog({
  businessUuid,
  quote,
  onOpenChange,
}: {
  businessUuid: string;
  quote: Quote;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createJob = useCreateJobFromQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    createJob.mutate(
      { quote_id: quote.id },
      {
        onSuccess: (job) => {
          toast.success(`${job.reference} created from quote ${quote.number} — book it in`);
          router.push(`/b/${businessUuid}/jobs?job=${job.id}`);
        },
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert quote {quote.number} to a job?</AlertDialogTitle>
          <AlertDialogDescription>
            Creates a job worth {formatCents(quote.subtotal_cents, quote.currency)} (ex. tax) with
            the same line items, ready to schedule for{" "}
            {quote.contact?.name ?? "the customer"}. A quote converts once — the quote stays here
            with its history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={createJob.isPending} onClick={confirm}>
            {createJob.isPending ? "Converting…" : "Create job"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
