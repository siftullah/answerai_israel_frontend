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
import { useUpdateLead } from "@/hooks/use-leads";
import type { Lead } from "@/lib/api/types";

/** Back into the pipeline as Contacted — the transition is journaled. */
export function ReopenLeadDialog({
  businessUuid,
  lead,
  onOpenChange,
}: {
  businessUuid: string;
  lead: Lead;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("leads.reopen");
  const tc = useTranslations("common");
  const updateLead = useUpdateLead(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    updateLead.mutate(
      { id: lead.id, payload: { status: "contacted" } },
      {
        onSuccess: () => toast.success(t("toast")),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {lead.status === "won"
              ? t("descriptionWon", { title: lead.title })
              : t("description", { title: lead.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={updateLead.isPending} onClick={confirm}>
            {updateLead.isPending ? tc("actions.saving") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
