"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, DiscIcon, FileTextIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { AudioPlayer } from "@/components/audio-player";
import { useBusiness } from "@/components/business/business-provider";
import { LiveDuration } from "@/components/calls/live-duration";
import { CallDetailHeader } from "@/components/calls/detail/call-detail-header";
import { CallExtractionSection } from "@/components/calls/detail/call-extraction-section";
import { CallNotesSection } from "@/components/calls/detail/call-notes-section";
import { CallRelatedSection } from "@/components/calls/detail/call-related-section";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { LiveCallBanner } from "@/components/calls/detail/live-call-banner";
import {
  OtherRecordingsModal,
  hasOtherRecordings,
} from "@/components/calls/detail/other-recordings-modal";
import { TranscriptModal } from "@/components/calls/detail/transcript-modal";
import { CancelCallDialog } from "@/components/calls/cancel-call-dialog";
import { useCall, useCallRecording } from "@/hooks/use-calls";
import { formatEndReason } from "@/lib/call-end-reason";
import { formatDateTime, formatDuration } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import {
  CANCELABLE_CALL_STATUSES,
  TRANSITIONAL_CALL_STATUSES,
  type Call,
} from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  const t = useTranslations("calls.detail");
  return (
    <Button variant="ghost" size="sm" className="mb-3 self-start lg:hidden" onClick={onBack}>
      <ArrowLeftIcon className="rtl:-scale-x-100" />
      {t("backToList")}
    </Button>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function RecordingStrip({ businessUuid, call }: { businessUuid: string; call: Call }) {
  const t = useTranslations("calls.detail");
  const available = call.recording_status === "available";
  const recording = useCallRecording(businessUuid, call.id, { enabled: available });

  if (available) {
    return (
      <div className="rounded-xl bg-muted/40 px-4 py-3">
        {recording.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : recording.isError ? (
          <p className="text-sm text-muted-foreground">{t("recordingLoadFailed")}</p>
        ) : (
          <AudioPlayer
            src={recording.data.url}
            durationHint={call.recording_duration_seconds}
            downloadName={`call-recording-${call.id}`}
          />
        )}
      </div>
    );
  }

  const notes: Partial<Record<Call["recording_status"], string>> = {
    pending: t("recordingProcessing"),
    processing: t("recordingProcessing"),
    failed: t("recordingFailed"),
    deleted: t("recordingDeleted"),
  };
  const note = notes[call.recording_status];
  return note ? <p className="text-sm text-muted-foreground">{note}</p> : null;
}

function MetaBand({
  businessUuid,
  call,
  timeZone,
}: {
  businessUuid: string;
  call: Call;
  timeZone: string;
}) {
  const t = useTranslations("calls");
  const live = TRANSITIONAL_CALL_STATUSES.includes(call.status);
  // The counterpart is already in the header; show the business's own line.
  const businessLine = call.direction === "inbound" ? call.to_e164 : call.from_e164;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label={call.direction === "inbound" ? t("detail.receivedOn") : t("detail.calledFrom")}>
        {formatE164(businessLine)}
      </Meta>
      <Meta label={t("labels.agent")}>
        {call.agent ? (
          <Link
            href={`/b/${businessUuid}/agents/${call.agent.id}`}
            className="text-primary hover:underline"
          >
            {call.agent.name}
          </Link>
        ) : (
          "—"
        )}
      </Meta>
      <Meta label={t("detail.started")}>
        {formatDateTime(call.started_at ?? call.created_at, timeZone)}
      </Meta>
      <Meta label={t("detail.duration")}>
        {live ? (
          <LiveDuration startedAt={call.started_at} className="tabular-nums" />
        ) : call.duration_seconds !== null ? (
          formatDuration(call.duration_seconds)
        ) : (
          "—"
        )}
      </Meta>
      <Meta label={t("detail.endReason")}>{formatEndReason(call.end_reason_code, call.end_reason) ?? "—"}</Meta>
    </dl>
  );
}

/**
 * The right pane. Keys off the ?call uuid alone — a selection that isn't in
 * the current list (deep link, filtered out) still renders. A flat scrolling
 * column: identity, the routing/recording block, then summary, notes,
 * extracted details and what the call produced. Transcript and the transfer's
 * other recordings open as modals.
 */
export function CallDetailPane({
  businessUuid,
  callUuid,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  callUuid: string | null;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("calls");
  const { business } = useBusiness();
  const callQuery = useCall(businessUuid, callUuid);
  const [cancelling, setCancelling] = useState<Call | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [recordingsOpen, setRecordingsOpen] = useState(false);

  if (callUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PhoneIcon />
          </EmptyMedia>
          <EmptyTitle>{t("detail.emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("detail.emptyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (callQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <BackButton onBack={onBack} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (callQuery.isError) {
    const notFound = callQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? t("errors.notFoundTitle") : t("errors.loadFailedTitle")}
          message={notFound ? t("errors.notFoundMessage") : callQuery.error.message}
          onRetry={notFound ? onClearSelection : () => callQuery.refetch()}
        />
      </div>
    );
  }

  const call = callQuery.data;
  const terminal = !TRANSITIONAL_CALL_STATUSES.includes(call.status);
  const cancelable =
    call.direction === "outbound" && CANCELABLE_CALL_STATUSES.includes(call.status);
  // Voicemail calls were answered too (the agent spoke to the machine), so they carry a transcript.
  const showTranscript = call.status === "completed" || call.status === "voicemail";
  const showRecordings = hasOtherRecordings(call);

  return (
    <div key={call.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pe-4">
        <div className="flex flex-col divide-y divide-border">
          {/* Identity + routing + recording + actions */}
          <div className="flex flex-col gap-4 pb-6">
            <CallDetailHeader
              call={call}
              businessUuid={businessUuid}
              onCancel={cancelable ? () => setCancelling(call) : undefined}
            />
            {!terminal && <LiveCallBanner call={call} />}
            <MetaBand businessUuid={businessUuid} call={call} timeZone={business.timezone} />
            {terminal && <RecordingStrip businessUuid={businessUuid} call={call} />}
            {(showTranscript || showRecordings) && (
              <div className="flex flex-wrap gap-2">
                {showTranscript && (
                  <Button size="sm" onClick={() => setTranscriptOpen(true)}>
                    <FileTextIcon />
                    {t("actions.viewTranscript")}
                  </Button>
                )}
                {showRecordings && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                    onClick={() => setRecordingsOpen(true)}
                  >
                    <DiscIcon />
                    {t("actions.otherRecordings")}
                  </Button>
                )}
              </div>
            )}
          </div>

          {(call.summary_title || call.summary) && (
            <DetailCard title={call.summary_title ?? t("detail.summary")} accent>
              {call.summary && (
                <p dir="auto" className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {call.summary}
                </p>
              )}
            </DetailCard>
          )}
          <CallNotesSection businessUuid={businessUuid} call={call} />
          <CallExtractionSection businessUuid={businessUuid} callUuid={call.id} enabled={terminal} />
          <CallRelatedSection businessUuid={businessUuid} callUuid={call.id} enabled={terminal} />
        </div>
      </div>

      {showTranscript && (
        <TranscriptModal
          businessUuid={businessUuid}
          call={call}
          open={transcriptOpen}
          onOpenChange={setTranscriptOpen}
        />
      )}
      {showRecordings && (
        <OtherRecordingsModal
          businessUuid={businessUuid}
          call={call}
          timeZone={business.timezone}
          open={recordingsOpen}
          onOpenChange={setRecordingsOpen}
        />
      )}
      <CancelCallDialog
        businessUuid={businessUuid}
        call={cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
      />
    </div>
  );
}
