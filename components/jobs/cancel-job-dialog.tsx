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
  const t = useTranslations("jobs");
  const cancelJob = useCancelJob(businessUuid);
  const [reason, setReason] = useState("");

  // The dialog stays mounted until the request settles — closing immediately
  // would unmount the mutation observer and skip these callbacks.
  const confirm = () => {
    const trimmed = reason.trim();
    cancelJob.mutate(
      { id: job.id, ...(trimmed !== "" ? { reason: trimmed } : {}) },
      {
        onSuccess: () => toast.success(t("toasts.canceled", { reference: job.reference })),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cancel.title", { reference: job.reference })}</DialogTitle>
          <DialogDescription>
            {job.scheduled_start ? t("cancel.descriptionBooked") : t("cancel.descriptionOpen")}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="cancel-job-reason">{t("cancel.reason")}</FieldLabel>
          <Input
            id="cancel-job-reason"
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("cancel.reasonPlaceholder")}
          />
          <FieldDescription>{t("cancel.reasonHint")}</FieldDescription>
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("keepJob")}
          </Button>
          <Button variant="destructive" disabled={cancelJob.isPending} onClick={confirm}>
            {cancelJob.isPending ? t("cancel.canceling") : t("cancel.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
