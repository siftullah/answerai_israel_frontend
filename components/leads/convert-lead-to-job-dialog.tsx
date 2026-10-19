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
import { useConvertLeadToJob } from "@/hooks/use-leads";
import type { Lead } from "@/lib/api/types";

/** Spins the lead off into a job for scheduling and delivery. */
export function ConvertLeadToJobDialog({
  businessUuid,
  lead,
  onOpenChange,
}: {
  businessUuid: string;
  lead: Lead;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("leads.convert");
  const tc = useTranslations("common");
  const convertLead = useConvertLeadToJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    convertLead.mutate(
      { lead_id: lead.id },
      {
        onSuccess: (job) => toast.success(t("toast", { reference: job.reference })),
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
            {lead.contact?.name
              ? t("descriptionNamed", { title: lead.title, name: lead.contact.name })
              : t("description", { title: lead.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={convertLead.isPending} onClick={confirm}>
            {convertLead.isPending ? t("converting") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
