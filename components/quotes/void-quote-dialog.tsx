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
  const t = useTranslations("quotes");
  const voidQuote = useVoidQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    voidQuote.mutate(quote.id, {
      onSuccess: () => toast.success(t("toasts.voided", { number: quote.number })),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("voidDialog.title", { number: quote.number })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("voidDialog.description", {
              amount: formatCents(quote.total_cents, quote.currency),
              customer: quote.contact?.name ?? t("theCustomer"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.keepQuote")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={voidQuote.isPending}
            onClick={confirm}
          >
            {voidQuote.isPending ? t("actions.voiding") : t("actions.voidQuote")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
