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
  const convertLead = useConvertLeadToJob(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    convertLead.mutate(
      { lead_id: lead.id },
      {
        onSuccess: (job) => toast.success(`Job ${job.reference} created`),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert this lead to a job?</AlertDialogTitle>
          <AlertDialogDescription>
            Creates a job for &ldquo;{lead.title}&rdquo; with{" "}
            {lead.contact?.name ?? "the contact"} attached, ready to schedule. The lead stays
            here with its history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={convertLead.isPending} onClick={confirm}>
            {convertLead.isPending ? "Converting…" : "Convert to job"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
