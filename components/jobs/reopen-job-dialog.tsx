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
  const reopenJob = useReopenJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    reopenJob.mutate(job.id, {
      onSuccess: () => toast.success(`${job.reference} reopened — book a new time when ready`),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reopen {job.reference}?</AlertDialogTitle>
          <AlertDialogDescription>
            The job goes back to open and unscheduled — any previous booking stays cleared, so
            schedule a fresh visit when you&apos;re ready. Its history is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={reopenJob.isPending} onClick={confirm}>
            {reopenJob.isPending ? "Reopening…" : "Reopen job"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
