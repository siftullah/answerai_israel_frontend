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
  const updateLead = useUpdateLead(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    updateLead.mutate(
      { id: lead.id, payload: { status: "won" } },
      {
        onSuccess: () => toast.success("Lead marked as won"),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this lead as won?</AlertDialogTitle>
          <AlertDialogDescription>
            Closes &ldquo;{lead.title}&rdquo; as won
            {lead.value_cents !== null
              ? ` and counts ${formatCents(lead.value_cents, lead.currency ?? "AUD")} toward the month's total`
              : ""}
            . You can reopen it later if things change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={updateLead.isPending} onClick={confirm}>
            {updateLead.isPending ? "Saving…" : "Mark as won"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
