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
import { useCreateInvoiceFromJob } from "@/hooks/use-jobs";
import { formatCents } from "@/lib/money";
import type { Job } from "@/lib/api/types";

/**
 * Completed job → draft invoice, then straight to the invoice so the user can
 * review and send it. Line items copy across; GST applies at your default rate.
 */
export function ConvertJobToInvoiceDialog({
  businessUuid,
  job,
  onOpenChange,
}: {
  businessUuid: string;
  job: Job;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createInvoice = useCreateInvoiceFromJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    createInvoice.mutate(
      { job },
      {
        onSuccess: (invoice) => {
          toast.success(`Invoice ${invoice.number} drafted from ${job.reference}`);
          router.push(`/b/${businessUuid}/invoices?invoice=${invoice.id}`);
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
          <AlertDialogTitle>Invoice {job.reference}?</AlertDialogTitle>
          <AlertDialogDescription>
            Drafts an invoice
            {job.quote_cents !== null
              ? ` for ${formatCents(job.quote_cents, job.currency ?? "AUD")} (plus tax)`
              : ""}{" "}
            copying the job&apos;s line items, ready to review and send to{" "}
            {job.contact?.name ?? "the customer"}. A job is invoiced once.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={createInvoice.isPending} onClick={confirm}>
            {createInvoice.isPending ? "Converting…" : "Create invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
