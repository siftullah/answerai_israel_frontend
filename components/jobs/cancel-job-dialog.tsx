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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCancelJob } from "@/hooks/use-jobs";
import type { Job } from "@/lib/api/types";

/** Cancels the job; a booked visit is announced to the customer by email. */
export function CancelJobDialog({
  open,
  businessUuid,
  job,
  onOpenChange,
}: {
  open: boolean;
  businessUuid: string;
  job: Job;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelJob = useCancelJob(businessUuid);
  const [reason, setReason] = useState("");

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    const trimmed = reason.trim();
    cancelJob.mutate(
      { id: job.id, ...(trimmed !== "" ? { reason: trimmed } : {}) },
      {
        onSuccess: () => toast.success(`${job.reference} canceled`),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel {job.reference}?</DialogTitle>
          <DialogDescription>
            {job.scheduled_start
              ? "The booked visit is called off and the customer gets a cancellation email."
              : "The job is closed as canceled — it can be reopened later."}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="cancel-job-reason">Reason</FieldLabel>
          <Input
            id="cancel-job-reason"
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Customer postponed, no access… (optional)"
          />
          <FieldDescription>Kept on the job — and quoted in the customer email.</FieldDescription>
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep job
          </Button>
          <Button variant="destructive" disabled={cancelJob.isPending} onClick={confirm}>
            {cancelJob.isPending ? "Canceling…" : "Cancel job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
