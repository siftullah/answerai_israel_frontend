"use client";

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
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const acceptQuote = useAcceptQuote(businessUuid);
  const descriptionValues = {
    customer: quote.contact?.name ?? t("theCustomer"),
    amount: formatCents(quote.total_cents, quote.currency),
  };

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    acceptQuote.mutate(quote.id, {
      onSuccess: () => toast.success(t("toasts.accepted", { number: quote.number })),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("acceptDialog.title", { number: quote.number })}</AlertDialogTitle>
          <AlertDialogDescription>
            {quote.status === "expired"
              ? t("acceptDialog.descriptionExpired", descriptionValues)
              : t("acceptDialog.description", descriptionValues)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={acceptQuote.isPending} onClick={confirm}>
            {acceptQuote.isPending ? tc("actions.saving") : t("acceptDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
