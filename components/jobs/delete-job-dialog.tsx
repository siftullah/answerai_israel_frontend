"use client";

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
  const deleteJob = useDeleteJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        toast.success(`${job.reference} deleted`);
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
          <AlertDialogTitle>Delete {job.reference}?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{job.title}&rdquo; and its timeline disappear from the portal. A booked visit
            stops blocking the schedule. Invoices already raised from it are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep job</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteJob.isPending}
            onClick={confirm}
          >
            {deleteJob.isPending ? "Deleting…" : "Delete job"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
