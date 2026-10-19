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
import { useVoidInvoice } from "@/hooks/use-invoices";
import { formatCents } from "@/lib/money";
import type { Invoice } from "@/lib/api/types";

export function VoidInvoiceDialog({
  businessUuid,
  invoice,
  onOpenChange,
}: {
  businessUuid: string;
  invoice: Invoice;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("invoices");
  const voidInvoice = useVoidInvoice(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    voidInvoice.mutate(invoice.id, {
      onSuccess: () => toast.success(t("toasts.voided", { number: invoice.number })),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("voidDialog.title", { number: invoice.number })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("voidDialog.description", {
              amount: formatCents(invoice.total_cents, invoice.currency),
              customer: invoice.contact?.name ?? t("theCustomer"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.keepInvoice")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={voidInvoice.isPending}
            onClick={confirm}
          >
            {voidInvoice.isPending ? t("actions.voiding") : t("actions.voidInvoice")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
