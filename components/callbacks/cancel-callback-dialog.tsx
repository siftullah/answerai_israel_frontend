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
import { useBusiness } from "@/components/business/business-provider";
import { useCancelCallback } from "@/hooks/use-callbacks";
import { formatDateTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import type { Callback } from "@/lib/api/types";

export function CancelCallbackDialog({
  businessUuid,
  callback,
  onOpenChange,
}: {
  businessUuid: string;
  callback: Callback | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const cancelCallback = useCancelCallback(businessUuid);

  const confirm = () => {
    if (!callback) return;
    cancelCallback.mutate(callback.id, {
      onSuccess: () => toast.success("Callback canceled"),
      onError: (error) => toast.error(error.message),
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={callback !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this callback?</AlertDialogTitle>
          <AlertDialogDescription>
            {callback
              ? `${callback.contact?.name ?? formatE164(callback.to_e164)} won't be called back at ${formatDateTime(callback.scheduled_at, business.timezone)}. This can't be undone.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep callback</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Cancel callback</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
