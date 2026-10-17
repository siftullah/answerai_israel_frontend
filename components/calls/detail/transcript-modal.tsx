"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TranscriptBubbles } from "@/components/calls/detail/transcript-bubbles";
import { counterpartName } from "@/components/calls/call-identity";
import { formatDuration } from "@/lib/datetime";
import type { Call } from "@/lib/api/types";

/** The full conversation in a large scrollable modal. */
export function TranscriptModal({
  businessUuid,
  call,
  open,
  onOpenChange,
}: {
  businessUuid: string;
  call: Call;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Transcript</DialogTitle>
          <DialogDescription>
            {counterpartName(call)}
            {call.duration_seconds !== null && ` · ${formatDuration(call.duration_seconds)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="scrollbar-slim -mx-2 min-h-0 flex-1 overflow-y-auto px-2">
          <TranscriptBubbles businessUuid={businessUuid} callUuid={call.id} enabled={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
