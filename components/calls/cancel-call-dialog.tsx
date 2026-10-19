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
  const t = useTranslations("calls");
  const cancelCall = useCancelCall(businessUuid);

  const confirm = () => {
    if (!call) return;
    cancelCall.mutate(call.id, {
      onSuccess: () => toast.success(t("toasts.callCancelled")),
      onError: (error) => toast.error(error.message),
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={call !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {call ? t("cancelDialog.description", { name: counterpartName(call) }) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancelDialog.keepCalling")}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>{t("actions.cancelCall")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
