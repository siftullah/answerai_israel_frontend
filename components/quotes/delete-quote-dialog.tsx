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
import { useDeleteQuote } from "@/hooks/use-quotes";
import type { Quote } from "@/lib/api/types";

export function DeleteQuoteDialog({
  businessUuid,
  quote,
  onOpenChange,
  onDeleted,
}: {
  businessUuid: string;
  quote: Quote;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const deleteQuote = useDeleteQuote(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteQuote.mutate(quote.id, {
      onSuccess: () => {
        toast.success(t("toasts.draftDeleted", { number: quote.number }));
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
          <AlertDialogTitle>{t("deleteDialog.title", { number: quote.number })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.keepDraft")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteQuote.isPending}
            onClick={confirm}
          >
            {deleteQuote.isPending ? tc("actions.deleting") : t("actions.deleteDraft")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
