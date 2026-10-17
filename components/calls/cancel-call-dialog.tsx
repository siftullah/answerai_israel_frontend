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
import { useCancelCall } from "@/hooks/use-calls";
import { counterpartName } from "@/components/calls/call-identity";
import type { Call } from "@/lib/api/types";

/** Cancels a pre-connect outbound call (queued / initiating / ringing). */
export function CancelCallDialog({
  businessUuid,
  call,
  onOpenChange,
}: {
  businessUuid: string;
  call: Call | null;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelCall = useCancelCall(businessUuid);

  const confirm = () => {
    if (!call) return;
    cancelCall.mutate(call.id, {
      onSuccess: () => toast.success("Call cancelled"),
      onError: (error) => toast.error(error.message),
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={call !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this call?</AlertDialogTitle>
          <AlertDialogDescription>
            {call
              ? `The call to ${counterpartName(call)} hasn't connected yet and will be stopped.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep calling</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Cancel call</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
