"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { useUpdateCallNotes } from "@/hooks/use-calls";
import type { Call } from "@/lib/api/types";

/** The one editable field on a call. Keyed remount per call resets drafts. */
export function CallNotesSection({
  businessUuid,
  call,
}: {
  businessUuid: string;
  call: Call;
}) {
  const t = useTranslations("calls");
  const tc = useTranslations("common");
  const [draft, setDraft] = useState(call.notes ?? "");
  const updateNotes = useUpdateCallNotes(businessUuid);

  const dirty = draft !== (call.notes ?? "");

  const save = () =>
    updateNotes.mutate(
      { id: call.id, notes: draft.trim() === "" ? null : draft },
      {
        onSuccess: () => toast.success(t("toasts.notesSaved")),
        onError: (error) => toast.error(error.message),
      }
    );

  return (
    <DetailCard title={tc("labels.notes")} description={t("notes.description")} accent>
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("notes.placeholder")}
          maxLength={5000}
          aria-label={t("notes.ariaLabel")}
        />
        {dirty && (
          <Button size="sm" className="self-end" onClick={save} disabled={updateNotes.isPending}>
            {updateNotes.isPending ? tc("actions.saving") : t("actions.saveNotes")}
          </Button>
        )}
      </div>
    </DetailCard>
  );
}
