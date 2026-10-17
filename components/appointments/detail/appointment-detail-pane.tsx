"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CalendarClockIcon,
  CheckIcon,
  PencilIcon,
  PhoneForwardedIcon,
  UserRoundIcon,
  UserRoundPenIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import {
  appointmentNeedsReview,
  NeedsReviewBadge,
} from "@/components/appointments/list/appointment-list-row";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { CancelAppointmentDialog } from "@/components/calendar/cancel-appointment-dialog";
import { ReassignAppointmentDialog } from "@/components/calendar/reassign-appointment-dialog";
import { RescheduleAppointmentDialog } from "@/components/calendar/reschedule-appointment-dialog";
import { DetailCard } from "@/components/calls/detail/detail-card";
import {
  useAppointment,
  useCompleteAppointment,
  useConfirmAppointment,
  useMarkAppointmentNoShow,
  useUpdateAppointment,
} from "@/hooks/use-appointments";
import { dayKey, formatDateTime, formatTimeOfDay } from "@/lib/datetime";
import type { Appointment } from "@/lib/api/types";
import {
  APPOINTMENT_SOURCE_LABELS,
  UPCOMING_APPOINTMENT_STATUSES,
} from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="mb-3 self-start lg:hidden" onClick={onBack}>
      <ArrowLeftIcon />
      All appointments
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

function MetaBand({ appointment, timeZone }: { appointment: Appointment; timeZone: string }) {
  const minutes = Math.round(
    (Date.parse(appointment.ends_at) - Date.parse(appointment.starts_at)) / 60_000
  );

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label="When">
        {formatDateTime(appointment.starts_at, timeZone)} –{" "}
        {formatTimeOfDay(appointment.ends_at, timeZone)}
        <span className="block text-xs font-normal text-muted-foreground">{minutes} minutes</span>
      </Meta>
      <Meta label="Assignee">{appointment.member?.name ?? "Unassigned"}</Meta>
      <Meta label="Source">{APPOINTMENT_SOURCE_LABELS[appointment.source]}</Meta>
      <Meta label="Booked">{formatDateTime(appointment.created_at, timeZone)}</Meta>
      {appointment.status === "canceled" && appointment.canceled_reason && (
        <Meta label="Cancel reason">{appointment.canceled_reason}</Meta>
      )}
    </dl>
  );
}

/** Inline notes editor backed by PATCH /appointments/{id} (notes only). */
function NotesCard({ businessUuid, appointment }: { businessUuid: string; appointment: Appointment }) {
  const update = useUpdateAppointment(businessUuid);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEditing = () => {
    setDraft(appointment.notes ?? "");
    setEditing(true);
  };

  const save = () => {
    update.mutate(
      { id: appointment.id, payload: { notes: draft.trim() || null } },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          setEditing(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <DetailCard
      title="Notes"
      actions={
        !editing ? (
          <Button variant="ghost" size="sm" onClick={startEditing}>
            <PencilIcon />
            {appointment.notes ? "Edit" : "Add notes"}
          </Button>
        ) : undefined
      }
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Anything the team should know"
            aria-label="Appointment notes"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </div>
      ) : appointment.notes ? (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{appointment.notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}
    </DetailCard>
  );
}

/**
 * The right pane. Keys off the ?appointment uuid alone — a selection that
 * isn't in the current tab (deep link, filtered out) still renders. Transition
 * actions apply to open bookings only; terminal ones go view-only.
 */
export function AppointmentDetailPane({
  businessUuid,
  appointmentUuid,
  nowMs,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  appointmentUuid: string | null;
  nowMs: number;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const { business } = useBusiness();
  const appointmentQuery = useAppointment(businessUuid, appointmentUuid);

  const confirm = useConfirmAppointment(businessUuid);
  const complete = useCompleteAppointment(businessUuid);
  const noShow = useMarkAppointmentNoShow(businessUuid);
  const [rescheduling, setRescheduling] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [canceling, setCanceling] = useState(false);

  if (appointmentUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDaysIcon />
          </EmptyMedia>
          <EmptyTitle>No appointment selected</EmptyTitle>
          <EmptyDescription>Select a booking to see its details.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (appointmentQuery.isPending) {
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

  if (appointmentQuery.isError) {
    const notFound = appointmentQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? "Appointment not found" : "Couldn't load this appointment"}
          message={
            notFound
              ? "This appointment doesn't exist or was removed."
              : appointmentQuery.error.message
          }
          onRetry={notFound ? onClearSelection : () => appointmentQuery.refetch()}
        />
      </div>
    );
  }

  const appointment = appointmentQuery.data;
  const actionable = UPCOMING_APPOINTMENT_STATUSES.includes(appointment.status);
  const ended = Date.parse(appointment.ends_at) < nowMs;
  const needsReview = appointmentNeedsReview(appointment, nowMs);
  const acting = confirm.isPending || complete.isPending || noShow.isPending;

  const run = (mutation: typeof confirm, successMessage: string) =>
    mutation.mutate(appointment.id, {
      onSuccess: () => toast.success(successMessage),
      onError: (error) => toast.error(error.message),
    });

  const calendarHref = `/b/${businessUuid}/calendar?view=day&date=${dayKey(
    appointment.starts_at,
    business.timezone
  )}`;

  return (
    <div key={appointment.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-4">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-4 pb-6">
            {/* Identity + status */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="max-w-full truncate font-heading text-2xl font-semibold">
                  {appointment.contact?.name ?? "—"}
                </h2>
                <AppointmentStatusBadge status={appointment.status} />
                {needsReview && <NeedsReviewBadge />}
                {appointment.source !== "manual" && (
                  <Badge variant="outline">{APPOINTMENT_SOURCE_LABELS[appointment.source]}</Badge>
                )}
              </div>
              {appointment.contact && (
                <Button
                  variant="cta"
                  size="sm"
                  render={<Link href={`/b/${businessUuid}/contacts/${appointment.contact.id}`} />}
                >
                  <UserRoundIcon />
                  View contact
                </Button>
              )}
            </div>

            <MetaBand appointment={appointment} timeZone={business.timezone} />

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="mr-auto px-2" render={<Link href={calendarHref} />}>
                <CalendarDaysIcon />
                View on calendar
              </Button>
              {actionable && (
                <>
                  {appointment.status === "scheduled" && (
                    <Button size="sm" disabled={acting} onClick={() => run(confirm, "Appointment confirmed")}>
                      <CheckIcon />
                      Confirm
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                    disabled={acting}
                    onClick={() => run(complete, "Appointment completed")}
                  >
                    <CheckIcon />
                    Complete
                  </Button>
                  {ended && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting}
                      onClick={() => run(noShow, "Marked as no-show")}
                    >
                      No-show
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => setRescheduling(true)}>
                    <CalendarClockIcon />
                    Reschedule
                  </Button>
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => setReassigning(true)}>
                    <UserRoundPenIcon />
                    Reassign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={acting}
                    onClick={() => setCanceling(true)}
                  >
                    <XIcon />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          <NotesCard businessUuid={businessUuid} appointment={appointment} />

          {appointment.call && (
            <DetailCard title="Booked on a call">
              <Link
                href={`/b/${businessUuid}/calls/${appointment.call.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PhoneForwardedIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {appointment.call.direction === "inbound" ? "Inbound call" : "Outbound call"}
                    {appointment.call.started_at &&
                      ` · ${formatDateTime(appointment.call.started_at, business.timezone)}`}
                  </span>
                </span>
                <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </DetailCard>
          )}
        </div>
      </div>

      {rescheduling && (
        <RescheduleAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setRescheduling(false);
          }}
          appointmentUuid={appointment.id}
          startsAt={appointment.starts_at}
          memberId={appointment.member?.id ?? ""}
        />
      )}
      {reassigning && (
        <ReassignAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setReassigning(false);
          }}
          appointmentUuid={appointment.id}
          memberId={appointment.member?.id ?? ""}
        />
      )}
      {canceling && (
        <CancelAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setCanceling(false);
          }}
          appointmentUuid={appointment.id}
        />
      )}
    </div>
  );
}
