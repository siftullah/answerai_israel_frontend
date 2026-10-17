"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useAddLeadNote, useUpdateLead } from "@/hooks/use-leads";
import type { ApiError } from "@/lib/api/errors";
import type { Lead } from "@/lib/api/types";

/** The hard no — the reason lands on the timeline, feeding the win-rate story. */
export function MarkLostLeadDialog({
  open,
  onOpenChange,
  businessUuid,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUuid: string;
  lead: Lead;
}) {
  const updateLead = useUpdateLead(businessUuid);
  const addNote = useAddLeadNote(businessUuid);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = reason.trim();
    try {
      await updateLead.mutateAsync({ id: lead.id, payload: { status: "lost" } });
      // The reason rides the timeline as a note — best effort once lost stuck.
      if (trimmed !== "") await addNote.mutateAsync({ id: lead.id, note: `Lost — ${trimmed}` });
      toast.success("Lead marked as lost");
      onOpenChange(false);
    } catch (error) {
      setServerError((error as ApiError).message);
    }
  };

  const saving = updateLead.isPending || addNote.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark this lead as lost</DialogTitle>
          <DialogDescription>
            Closes &ldquo;{lead.title}&rdquo; without a win. You can reopen it later if{" "}
            {lead.contact?.name ?? "the contact"} comes back.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="lost-lead-reason">Reason</FieldLabel>
            <Input
              id="lost-lead-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Went with another provider"
            />
            <FieldDescription>Optional — added to the lead&apos;s timeline.</FieldDescription>
          </Field>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={saving}>
            <XIcon />
            {saving ? "Saving…" : "Mark as lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
