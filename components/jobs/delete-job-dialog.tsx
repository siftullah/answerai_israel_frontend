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
import { useDeleteJob } from "@/hooks/use-jobs";
import type { Job } from "@/lib/api/types";

export function DeleteJobDialog({
  businessUuid,
  job,
  onOpenChange,
  onDeleted,
}: {
  businessUuid: string;
  job: Job;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const deleteJob = useDeleteJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        toast.success(t("toasts.deleted", { reference: job.reference }));
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
          <AlertDialogTitle>{t("delete.title", { reference: job.reference })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("delete.description", { title: job.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keepJob")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteJob.isPending}
            onClick={confirm}
          >
            {deleteJob.isPending ? tc("actions.deleting") : t("delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
