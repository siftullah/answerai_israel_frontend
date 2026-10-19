"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
 * review and send it. Line items copy across; VAT applies at your default rate.
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
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const router = useRouter();
  const createInvoice = useCreateInvoiceFromJob(businessUuid);
  const customer = job.contact?.name ?? t("invoice.theCustomer");

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    createInvoice.mutate(
      { job },
      {
        onSuccess: (invoice) => {
          toast.success(
            t("toasts.invoiceDrafted", { number: invoice.number, reference: job.reference })
          );
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
          <AlertDialogTitle>{t("invoice.title", { reference: job.reference })}</AlertDialogTitle>
          <AlertDialogDescription>
            {job.quote_cents !== null
              ? t("invoice.descriptionWithAmount", {
                  amount: formatCents(job.quote_cents, job.currency ?? "ILS"),
                  customer,
                })
              : t("invoice.description", { customer })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={createInvoice.isPending} onClick={confirm}>
            {createInvoice.isPending ? t("invoice.converting") : t("invoice.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
