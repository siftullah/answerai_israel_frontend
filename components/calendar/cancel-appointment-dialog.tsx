"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBusiness } from "@/components/business/business-provider";
import { useCancelAppointment } from "@/hooks/use-appointments";

/** Cancel with an optional reason; the contact is emailed the cancellation. */
export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointmentUuid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentUuid: string;
}) {
  const t = useTranslations("calendar.cancelDialog");
  const { business } = useBusiness();
  const cancelAppointment = useCancelAppointment(business.id);
  const [reason, setReason] = useState("");

  const confirm = () => {
    cancelAppointment.mutate(
      { id: appointmentUuid, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("toasts.canceled"));
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="cancel-appointment-reason">{t("reason")}</FieldLabel>
          <Input
            id="cancel-appointment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder={t("reasonPlaceholder")}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={cancelAppointment.isPending}
          >
            {cancelAppointment.isPending ? t("canceling") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
