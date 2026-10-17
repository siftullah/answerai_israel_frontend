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
import { useDeleteLead } from "@/hooks/use-leads";
import type { Lead } from "@/lib/api/types";

export function DeleteLeadDialog({
  businessUuid,
  lead,
  onOpenChange,
  onDeleted,
}: {
  businessUuid: string;
  lead: Lead;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteLead = useDeleteLead(businessUuid);

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        toast.success("Lead deleted");
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
          <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{lead.title}&rdquo; and its activity timeline are removed for good. Mark it
            lost instead if you want to keep the history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep lead</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteLead.isPending}
            onClick={confirm}
          >
            {deleteLead.isPending ? "Deleting…" : "Delete lead"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
