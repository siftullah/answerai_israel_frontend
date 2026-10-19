"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarClockIcon,
  CheckIcon,
  PencilIcon,
  PhoneForwardedIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useBusiness } from "@/components/business/business-provider";
import {
  CallbackStatusBadge,
  OverdueBadge,
} from "@/components/callbacks/callback-status-badge";
import { CancelCallbackDialog } from "@/components/callbacks/cancel-callback-dialog";
import { CompleteCallbackDialog } from "@/components/callbacks/complete-callback-dialog";
import { EditCallbackDialog } from "@/components/callbacks/edit-callback-dialog";
import { RescheduleCallbackDialog } from "@/components/callbacks/reschedule-callback-dialog";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { useCallbackDetail } from "@/hooks/use-callbacks";
import { formatDateTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import type { Callback } from "@/lib/api/types";
import {
  CALLBACK_OUTCOME_LABELS,
  CALLBACK_SOURCE_LABELS,
  CALLBACK_TYPE_LABELS,
  TERMINAL_CALLBACK_STATUSES,
} from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  const t = useTranslations("callbacks.detail");
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

function MetaBand({
  businessUuid,
  callback,
  timeZone,
}: {
  businessUuid: string;
  callback: Callback;
  timeZone: string;
}) {
  const t = useTranslations("callbacks");
  const terminal = TERMINAL_CALLBACK_STATUSES.includes(callback.status);

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label={t("detail.scheduledFor")}>
        {formatDateTime(callback.scheduled_at, timeZone)}
        {callback.timezone !== timeZone && (
          <span className="block text-xs font-normal text-muted-foreground">
            {t("detail.requestedIn", { timezone: callback.timezone })}
          </span>
        )}
      </Meta>
      <Meta label={t("labels.type")}>{CALLBACK_TYPE_LABELS[callback.type]}</Meta>
      {callback.type === "agent" ? (
        <Meta label={t("labels.agent")}>
          {callback.agent ? (
            <Link
              href={`/b/${businessUuid}/agents/${callback.agent.id}`}
              className="text-primary hover:underline"
            >
              {callback.agent.name}
            </Link>
          ) : (
            "—"
          )}
        </Meta>
      ) : (
        <Meta label={t("labels.assignee")}>{callback.assignee?.name ?? "—"}</Meta>
      )}
      <Meta label={t("detail.numberToCall")}>
        <span className="tabular-nums">{formatE164(callback.to_e164)}</span>
      </Meta>
      {callback.type === "agent" && (
        <Meta label={t("detail.dialFrom")}>
          {callback.caller_phone_number ? (
            <span className="tabular-nums">
              {callback.caller_phone_number.friendly_name ??
                formatE164(callback.caller_phone_number.e164)}
            </span>
          ) : (
            t("detail.autoSelected")
          )}
        </Meta>
      )}
      {callback.type === "agent" && (
        <Meta label={t("detail.attempts")}>
          {t("detail.attemptsValue", {
            attempts: callback.attempts,
            max: callback.max_attempts,
          })}
          {callback.next_attempt_at && (
            <span className="block text-xs font-normal text-muted-foreground">
              {t("detail.nextAttempt", {
                date: formatDateTime(callback.next_attempt_at, timeZone),
              })}
            </span>
          )}
        </Meta>
      )}
      {callback.type === "team_member" && callback.reminder_sent_at && (
        <Meta label={t("detail.reminderEmailed")}>
          {formatDateTime(callback.reminder_sent_at, timeZone)}
        </Meta>
      )}
      {terminal && callback.outcome && (
        <Meta label={t("labels.outcome")}>{CALLBACK_OUTCOME_LABELS[callback.outcome]}</Meta>
      )}
      {terminal && callback.completed_at && (
        <Meta
          label={callback.status === "canceled" ? t("detail.closed") : t("detail.completed")}
        >
          {formatDateTime(callback.completed_at, timeZone)}
          {callback.completed_by && (
            <span className="block text-xs font-normal text-muted-foreground">
              {t("detail.byName", { name: callback.completed_by.name })}
            </span>
          )}
        </Meta>
      )}
      <Meta label={t("detail.created")}>
        {formatDateTime(callback.created_at, timeZone)}
        {callback.created_by && (
          <span className="block text-xs font-normal text-muted-foreground">
            {t("detail.byName", { name: callback.created_by.name })}
          </span>
        )}
      </Meta>
    </dl>
  );
}

function LinkedCallRow({
  businessUuid,
  callId,
  label,
}: {
  businessUuid: string;
  callId: string;
  label: string;
}) {
  return (
    <Link
      href={`/b/${businessUuid}/calls/${callId}`}
      className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
    >
      <span className="flex min-w-0 items-center gap-2">
        <PhoneForwardedIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{label}</span>
      </span>
      <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
    </Link>
  );
}

/**
 * The right pane. Keys off the ?callback uuid alone — a selection that isn't
 * in the current tab (deep link, filtered out) still renders. Actions are
 * limited to `scheduled`: once the dispatcher claims a row (queued) or it
 * lands terminal, the backend locks it and the pane goes view-only.
 */
export function CallbackDetailPane({
  businessUuid,
  callbackUuid,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  callbackUuid: string | null;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("callbacks");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const callbackQuery = useCallbackDetail(businessUuid, callbackUuid);
  const [rescheduling, setRescheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState<Callback | null>(null);

  if (callbackUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PhoneForwardedIcon />
          </EmptyMedia>
          <EmptyTitle>{t("detail.emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("detail.emptyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (callbackQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <BackButton onBack={onBack} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (callbackQuery.isError) {
    const notFound = callbackQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? t("detail.notFoundTitle") : t("detail.loadFailedTitle")}
          message={notFound ? t("detail.notFoundMessage") : callbackQuery.error.message}
          onRetry={notFound ? onClearSelection : () => callbackQuery.refetch()}
        />
      </div>
    );
  }

  const callback = callbackQuery.data;
  const number = formatE164(callback.to_e164);
  const name = callback.contact?.name ?? number;
  const actionable = callback.status === "scheduled";

  return (
    <div key={callback.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pe-4">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-4 pb-6">
            {/* Identity + status */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="max-w-full truncate font-heading text-2xl font-semibold">
                    {name}
                  </h2>
                  <CallbackStatusBadge status={callback.status} />
                  {callback.overdue && <OverdueBadge />}
                  {callback.source !== "manual" && (
                    <Badge variant="outline">{CALLBACK_SOURCE_LABELS[callback.source]}</Badge>
                  )}
                </div>
                {name !== number && (
                  <p className="truncate text-sm tabular-nums text-foreground/70">{number}</p>
                )}
              </div>
              {callback.contact && (
                <Button
                  variant="cta"
                  size="sm"
                  render={<Link href={`/b/${businessUuid}/contacts/${callback.contact.id}`} />}
                >
                  <UserRoundIcon />
                  {t("actions.viewContact")}
                </Button>
              )}
            </div>

            <MetaBand
              businessUuid={businessUuid}
              callback={callback}
              timeZone={business.timezone}
            />

            {actionable && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setRescheduling(true)}>
                  <CalendarClockIcon />
                  {t("actions.reschedule")}
                </Button>
                {callback.type === "team_member" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                    onClick={() => setCompleting(true)}
                  >
                    <CheckIcon />
                    {t("actions.complete")}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <PencilIcon />
                  {tc("actions.edit")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCancelling(callback)}
                >
                  <XIcon />
                  {tc("actions.cancel")}
                </Button>
              </div>
            )}
          </div>

          {callback.topic && (
            <DetailCard title={t("labels.topic")} accent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{callback.topic}</p>
            </DetailCard>
          )}

          {callback.notes && (
            <DetailCard title={tc("labels.notes")}>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{callback.notes}</p>
            </DetailCard>
          )}

          {(callback.origin_call_id || callback.result_call_id) && (
            <DetailCard title={t("detail.linkedCalls")}>
              <div className="flex flex-col gap-2">
                {callback.origin_call_id && (
                  <LinkedCallRow
                    businessUuid={businessUuid}
                    callId={callback.origin_call_id}
                    label={t("detail.promisedDuringCall")}
                  />
                )}
                {callback.result_call_id && (
                  <LinkedCallRow
                    businessUuid={businessUuid}
                    callId={callback.result_call_id}
                    label={
                      callback.status === "completed"
                        ? t("detail.fulfilledByCall")
                        : t("detail.latestAttempt")
                    }
                  />
                )}
              </div>
            </DetailCard>
          )}
        </div>
      </div>

      {rescheduling && (
        <RescheduleCallbackDialog
          open
          businessUuid={businessUuid}
          callback={callback}
          onOpenChange={(next) => {
            if (!next) setRescheduling(false);
          }}
        />
      )}
      {editing && (
        <EditCallbackDialog
          open
          businessUuid={businessUuid}
          callback={callback}
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
        />
      )}
      {completing && (
        <CompleteCallbackDialog
          open
          businessUuid={businessUuid}
          callback={callback}
          onOpenChange={(next) => {
            if (!next) setCompleting(false);
          }}
        />
      )}
      <CancelCallbackDialog
        businessUuid={businessUuid}
        callback={cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
      />
    </div>
  );
}
