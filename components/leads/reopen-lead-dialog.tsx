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
  const updateLead = useUpdateLead(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    updateLead.mutate(
      { id: lead.id, payload: { status: "contacted" } },
      {
        onSuccess: () => toast.success("Lead reopened"),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reopen this lead?</AlertDialogTitle>
          <AlertDialogDescription>
            Puts &ldquo;{lead.title}&rdquo; back in the pipeline as Contacted
            {lead.status === "won" ? " and removes it from the won totals" : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={updateLead.isPending} onClick={confirm}>
            {updateLead.isPending ? "Saving…" : "Reopen lead"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
