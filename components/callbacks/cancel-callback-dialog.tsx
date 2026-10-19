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
  const t = useTranslations("callbacks");
  const { business } = useBusiness();
  const cancelCallback = useCancelCallback(businessUuid);

  const confirm = () => {
    if (!callback) return;
    cancelCallback.mutate(callback.id, {
      onSuccess: () => toast.success(t("toasts.canceled")),
      onError: (error) => toast.error(error.message),
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={callback !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {callback
              ? t("cancelDialog.description", {
                  name: callback.contact?.name ?? formatE164(callback.to_e164),
                  date: formatDateTime(callback.scheduled_at, business.timezone),
                })
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.keepCallback")}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>{t("actions.cancelCallback")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
