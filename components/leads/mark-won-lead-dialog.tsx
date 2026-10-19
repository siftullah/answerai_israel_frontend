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
import { formatCents } from "@/lib/money";
import type { Lead } from "@/lib/api/types";

/** The happy terminal — the enquiry turned into work. */
export function MarkWonLeadDialog({
  businessUuid,
  lead,
  onOpenChange,
}: {
  businessUuid: string;
  lead: Lead;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("leads.markWon");
  const tc = useTranslations("common");
  const updateLead = useUpdateLead(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    updateLead.mutate(
      { id: lead.id, payload: { status: "won" } },
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
            {lead.value_cents !== null
              ? t("descriptionWithValue", {
                  title: lead.title,
                  value: formatCents(lead.value_cents, lead.currency ?? "ILS"),
                })
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
