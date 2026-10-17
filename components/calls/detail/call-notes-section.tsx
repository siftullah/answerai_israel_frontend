"use client";

import { useState } from "react";
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
  const [draft, setDraft] = useState(call.notes ?? "");
  const updateNotes = useUpdateCallNotes(businessUuid);

  const dirty = draft !== (call.notes ?? "");

  const save = () =>
    updateNotes.mutate(
      { id: call.id, notes: draft.trim() === "" ? null : draft },
      {
        onSuccess: () => toast.success("Notes saved"),
        onError: (error) => toast.error(error.message),
      }
    );

  return (
    <DetailCard title="Notes" description="Your own notes — never shown to callers." accent>
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add your own notes about this call…"
          maxLength={5000}
          aria-label="Call notes"
        />
        {dirty && (
          <Button size="sm" className="self-end" onClick={save} disabled={updateNotes.isPending}>
            {updateNotes.isPending ? "Saving…" : "Save notes"}
          </Button>
        )}
      </div>
    </DetailCard>
  );
}
