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
import { useReopenJob } from "@/hooks/use-jobs";
import type { Job } from "@/lib/api/types";

/** Closed job → back to the unscheduled open queue for a deliberate re-book. */
export function ReopenJobDialog({
  businessUuid,
  job,
  onOpenChange,
}: {
  businessUuid: string;
  job: Job;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const reopenJob = useReopenJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    reopenJob.mutate(job.id, {
      onSuccess: () => toast.success(t("toasts.reopened", { reference: job.reference })),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("reopen.title", { reference: job.reference })}</AlertDialogTitle>
          <AlertDialogDescription>{t("reopen.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={reopenJob.isPending} onClick={confirm}>
            {reopenJob.isPending ? t("reopen.reopening") : t("reopen.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
