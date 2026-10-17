"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioPlayer } from "@/components/audio-player";
import { CallStatusBadge } from "@/components/calls/call-status-badge";
import { TranscriptBubbles } from "@/components/calls/detail/transcript-bubbles";
import { useCall, useCallRecording } from "@/hooks/use-calls";
import { formatDateTime, formatDuration } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import type { Call, TransferNextAction, TransferState } from "@/lib/api/types";

const STATE_LABELS: Record<TransferState, string> = {
  consult_pending: "Consulting",
  accepted: "Accepted",
  bridged: "Connected",
  declined: "Declined",
  unavailable: "Unavailable",
  cancelled: "Cancelled",
};

const STATE_VARIANTS: Record<TransferState, "info" | "success" | "warning" | "outline"> = {
  consult_pending: "info",
  accepted: "success",
  bridged: "success",
  declined: "warning",
  unavailable: "warning",
  cancelled: "outline",
};

const NEXT_ACTION_LABELS: Record<TransferNextAction, string> = {
  take_callback_message: "Took a callback message",
  ask_to_call_back_later: "Asked the caller to call back later",
  redirect: "Redirected the caller",
  none: "No follow-up action",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** A recording that lives on a specific media collection of a call. */
function Recording({
  businessUuid,
  callUuid,
  type,
  downloadName,
}: {
  businessUuid: string;
  callUuid: string;
  /** Omit for the primary call recording; "conference" for the bridged leg. */
  type?: "conference";
  /** Base filename for the player's download button. */
  downloadName: string;
}) {
  const recording = useCallRecording(businessUuid, callUuid, { type, enabled: true });
  if (recording.isPending) return <Skeleton className="h-9 w-full" />;
  if (recording.isError) {
    return <p className="text-sm text-muted-foreground">This recording isn&apos;t ready yet.</p>;
  }
  return <AudioPlayer src={recording.data.url} downloadName={downloadName} />;
}

/** The consult leg (our bot briefing the responder): status, audio, transcript. */
function ConsultLeg({
  businessUuid,
  callUuid,
  timeZone,
}: {
  businessUuid: string;
  callUuid: string;
  timeZone: string;
}) {
  const callQuery = useCall(businessUuid, callUuid);
  const call = callQuery.data;

  if (callQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (callQuery.isError || !call) {
    return (
      <p className="text-sm text-muted-foreground">
        The consultation details couldn&apos;t be loaded right now.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <CallStatusBadge status={call.status} />
        {call.agent && <span>{call.agent.name}</span>}
        {call.duration_seconds !== null && (
          <span className="tabular-nums">{formatDuration(call.duration_seconds)}</span>
        )}
        {call.started_at && <span>{formatDateTime(call.started_at, timeZone)}</span>}
      </div>
      {call.recording_status === "available" && (
        <Recording
          businessUuid={businessUuid}
          callUuid={callUuid}
          downloadName={`consult-recording-${callUuid}`}
        />
      )}
      <div className="scrollbar-slim -mx-2 max-h-[38vh] overflow-y-auto px-2">
        <TranscriptBubbles businessUuid={businessUuid} callUuid={callUuid} enabled />
      </div>
    </div>
  );
}

/**
 * Everything about a warm/blind transfer, gathered off the primary call:
 * the handover summary, the consult leg (bot ↔ responder), and the bridged
 * caller ↔ responder recording. Consult legs never appear in the logs, so
 * this modal is their only home.
 */
export function OtherRecordingsModal({
  businessUuid,
  call,
  timeZone,
  open,
  onOpenChange,
}: {
  businessUuid: string;
  call: Call;
  timeZone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const transfer = call.transfer;
  if (!transfer) return null;

  const warm = transfer.status !== undefined;
  const hasBridged = warm ? transfer.conference_recording === true : transfer.recording === true;
  const consultId =
    transfer.consult_call_id && transfer.consult_call_id !== call.id
      ? transfer.consult_call_id
      : null;
  const responder = transfer.responder_name ?? null;
  const target = transfer.to_e164 ? formatE164(transfer.to_e164) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transfer recordings</DialogTitle>
          <DialogDescription>
            The consult and bridged legs of this handover.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-slim -mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
          {/* Handover summary */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4">
            <Field label="Type">
              <Badge variant="outline">{warm ? "Warm transfer" : "Blind transfer"}</Badge>
            </Field>
            {warm && transfer.status && (
              <Field label="Status">
                <Badge variant={STATE_VARIANTS[transfer.status]}>
                  {STATE_LABELS[transfer.status]}
                </Badge>
              </Field>
            )}
            {target && <Field label="Transferred to">{target}</Field>}
            {responder && <Field label="Answered by">{responder}</Field>}
            {transfer.at && <Field label="At">{formatDateTime(transfer.at, timeZone)}</Field>}
            {transfer.next_action && (
              <Field label="Outcome">
                {NEXT_ACTION_LABELS[transfer.next_action]}
                {transfer.action_detail && (
                  <span className="block text-xs text-muted-foreground">
                    {transfer.action_detail}
                  </span>
                )}
              </Field>
            )}
          </dl>

          {transfer.relay_message && (
            <div className="rounded-xl border-l-2 border-cta bg-muted/50 px-3.5 py-2.5">
              <p className="text-xs text-muted-foreground">Message relayed to the caller</p>
              <p className="mt-0.5 text-sm">{transfer.relay_message}</p>
            </div>
          )}

          {consultId && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Consultation leg</p>
              <ConsultLeg businessUuid={businessUuid} callUuid={consultId} timeZone={timeZone} />
            </div>
          )}

          {hasBridged && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Bridged call recording</p>
              <Recording
                businessUuid={businessUuid}
                callUuid={call.id}
                type="conference"
                downloadName={`bridged-recording-${call.id}`}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Whether the "Other recordings" affordance has anything to show. */
export function hasOtherRecordings(call: Call): boolean {
  const transfer = call.transfer;
  if (!transfer) return false;
  const warm = transfer.status !== undefined;
  const hasBridged = warm ? transfer.conference_recording === true : transfer.recording === true;
  const hasConsult = !!transfer.consult_call_id && transfer.consult_call_id !== call.id;
  return hasBridged || hasConsult;
}
