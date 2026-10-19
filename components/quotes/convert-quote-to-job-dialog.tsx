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
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const router = useRouter();
  const createJob = useCreateJobFromQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    createJob.mutate(
      { quote_id: quote.id },
      {
        onSuccess: (job) => {
          toast.success(
            t("toasts.convertedToJob", { job: job.reference, quote: quote.number })
          );
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
          <AlertDialogTitle>
            {t("convertToJobDialog.title", { number: quote.number })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("convertToJobDialog.description", {
              amount: formatCents(quote.subtotal_cents, quote.currency),
              customer: quote.contact?.name ?? t("theCustomer"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={createJob.isPending} onClick={confirm}>
            {createJob.isPending ? t("actions.converting") : t("convertToJobDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
