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
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const router = useRouter();
  const convertQuote = useConvertQuoteToInvoice(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    convertQuote.mutate(quote.id, {
      onSuccess: (invoice) => {
        toast.success(
          t("toasts.convertedToInvoice", { invoice: invoice.number, quote: quote.number })
        );
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
          <AlertDialogTitle>{t("convertDialog.title", { number: quote.number })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("convertDialog.description", {
              amount: formatCents(quote.total_cents, quote.currency),
              customer: quote.contact?.name ?? t("theCustomer"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={convertQuote.isPending} onClick={confirm}>
            {convertQuote.isPending ? t("actions.converting") : t("convertDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
