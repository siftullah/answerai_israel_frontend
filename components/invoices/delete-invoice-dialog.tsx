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
import { useDeleteInvoice } from "@/hooks/use-invoices";
import type { Invoice } from "@/lib/api/types";

export function DeleteInvoiceDialog({
  businessUuid,
  invoice,
  onOpenChange,
  onDeleted,
}: {
  businessUuid: string;
  invoice: Invoice;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
  const deleteInvoice = useDeleteInvoice(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteInvoice.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(t("toasts.draftDeleted", { number: invoice.number }));
        onDeleted?.();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("deleteDialog.title", { number: invoice.number })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.keepDraft")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteInvoice.isPending}
            onClick={confirm}
          >
            {deleteInvoice.isPending ? tc("actions.deleting") : t("actions.deleteDraft")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
