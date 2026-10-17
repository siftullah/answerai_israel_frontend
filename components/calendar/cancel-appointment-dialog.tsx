"use client";

import { useState } from "react";
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
  const { business } = useBusiness();
  const cancelAppointment = useCancelAppointment(business.id);
  const [reason, setReason] = useState("");

  const confirm = () => {
    cancelAppointment.mutate(
      { id: appointmentUuid, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Appointment canceled");
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
          <DialogTitle>Cancel this appointment?</DialogTitle>
          <DialogDescription>
            The slot frees up, the synced calendar copy is removed, and the contact is
            emailed a cancellation.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="cancel-appointment-reason">Reason</FieldLabel>
          <Input
            id="cancel-appointment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder="Shared with the contact (optional)"
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={cancelAppointment.isPending}
          >
            {cancelAppointment.isPending ? "Canceling…" : "Cancel appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
