"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("leads.markLost");
  const tc = useTranslations("common");
  const updateLead = useUpdateLead(businessUuid);
  const addNote = useAddLeadNote(businessUuid);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = reason.trim();
    try {
      await updateLead.mutateAsync({ id: lead.id, payload: { status: "lost" } });
      // The reason rides the timeline as a note — best effort once lost stuck.
      if (trimmed !== "") {
        await addNote.mutateAsync({ id: lead.id, note: t("note", { reason: trimmed }) });
      }
      toast.success(t("toast"));
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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {lead.contact?.name
              ? t("descriptionNamed", { title: lead.title, name: lead.contact.name })
              : t("description", { title: lead.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="lost-lead-reason">{t("reason")}</FieldLabel>
            <Input
              id="lost-lead-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder={t("reasonPlaceholder")}
            />
            <FieldDescription>{t("reasonHint")}</FieldDescription>
          </Field>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={saving}>
            <XIcon />
            {saving ? tc("actions.saving") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
