"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import {
  CallbackStatusBadge,
  CallbackTypeIcon,
  OverdueBadge,
} from "@/components/callbacks/callback-status-badge";
import { CancelCallbackDialog } from "@/components/callbacks/cancel-callback-dialog";
import { CompleteCallbackDialog } from "@/components/callbacks/complete-callback-dialog";
import { RescheduleCallbackDialog } from "@/components/callbacks/reschedule-callback-dialog";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { CancelAppointmentDialog } from "@/components/calendar/cancel-appointment-dialog";
import { RescheduleAppointmentDialog } from "@/components/calendar/reschedule-appointment-dialog";
import type { GridEvent } from "@/components/calendar/calendar-lib";
import { JobStatusBadge, JobPriorityBadge } from "@/components/jobs/job-status-badge";
import { ScheduleJobDialog } from "@/components/jobs/schedule-job-dialog";
import {
  useCompleteAppointment,
  useConfirmAppointment,
  useMarkAppointmentNoShow,
  useAppointment,
} from "@/hooks/use-appointments";
import { useCallbackDetail } from "@/hooks/use-callbacks";
import { useCompleteJob, useJobDetail, useStartJob } from "@/hooks/use-jobs";
import { formatDateTime, formatTimeOfDay } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import type { SystemCalendarItem } from "@/lib/api/types";
import {
  APPOINTMENT_SOURCE_LABELS,
  CALLBACK_TYPE_LABELS,
  JOB_SOURCE_LABELS,
  OPEN_CALLBACK_STATUSES,
} from "@/lib/api/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end break-words">{children}</span>
    </div>
  );
}

function WhenText({ event, timeZone }: { event: GridEvent; timeZone: string }) {
  return (
    <>
      {formatDateTime(event.starts_at, timeZone)} – {formatTimeOfDay(event.ends_at, timeZone)}
    </>
  );
}

function AppointmentDetail({
  event,
  item,
}: {
  event: GridEvent;
  item: Extract<SystemCalendarItem, { type: "appointment" }>;
}) {
  const t = useTranslations("calendar.detail");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const enabled = useModuleEnabled("appointments");
  const detailQuery = useAppointment(business.id, enabled ? item.id : null);
  const appointment = detailQuery.data;

  const confirm = useConfirmAppointment(business.id);
  const complete = useCompleteAppointment(business.id);
  const noShow = useMarkAppointmentNoShow(business.id);
  const [rescheduling, setRescheduling] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Frozen at dialog open — fine at this resolution, and pure during render.
  const [openedAtMs] = useState(() => Date.now());

  const status = appointment?.status ?? item.status;
  const startsAt = appointment?.starts_at ?? item.starts_at;
  const upcoming = status === "scheduled" || status === "confirmed";
  const ended = openedAtMs > Date.parse(appointment?.ends_at ?? item.ends_at);
  const acting = confirm.isPending || complete.isPending || noShow.isPending;

  const run = (
    mutation: typeof confirm,
    successMessage: string
  ) =>
    mutation.mutate(item.id, {
      onSuccess: () => toast.success(successMessage),
      onError: (error) => toast.error(error.message),
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>
          <WhenText event={event} timeZone={business.timezone} />
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-1.5">
        <AppointmentStatusBadge status={status} />
        {appointment && (
          <Badge variant="outline">{APPOINTMENT_SOURCE_LABELS[appointment.source]}</Badge>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <DetailRow label={t("contact")}>
          {item.contact ? (
            <Link
              href={`/b/${business.id}/contacts?contact=${item.contact.id}`}
              className="text-primary hover:underline"
            >
              {item.contact.name}
            </Link>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label={t("assignee")}>{item.member?.name ?? t("unassigned")}</DetailRow>
        {enabled && detailQuery.isPending && <Skeleton className="h-4 w-full" />}
        {appointment?.notes && (
          <DetailRow label={tc("labels.notes")}>{appointment.notes}</DetailRow>
        )}
        {appointment?.canceled_reason && (
          <DetailRow label={t("cancelReason")}>{appointment.canceled_reason}</DetailRow>
        )}
      </div>

      {!enabled && (
        <p className="text-sm text-muted-foreground">{t("appointment.moduleDisabled")}</p>
      )}

      {enabled && (
        <DialogFooter className="flex-wrap">
          <Button
            variant="ghost"
            className="me-auto px-2"
            render={
              <Link href={`/b/${business.id}/appointments?appointment=${item.id}`} />
            }
          >
            {t("appointment.open")}
            <ArrowUpRightIcon className="rtl:-scale-x-100" />
          </Button>
          {upcoming && (
            <>
              <Button
                variant="destructive-outline"
                disabled={acting}
                onClick={() => setCanceling(true)}
              >
                {t("appointment.cancel")}
              </Button>
              <Button variant="outline" disabled={acting} onClick={() => setRescheduling(true)}>
                {t("reschedule")}
              </Button>
              {ended && (
                <Button
                  variant="warning"
                  disabled={acting}
                  onClick={() => run(noShow, t("appointment.toasts.noShow"))}
                >
                  {t("appointment.noShow")}
                </Button>
              )}
              <Button
                variant="success"
                disabled={acting}
                onClick={() => run(complete, t("appointment.toasts.completed"))}
              >
                {t("complete")}
              </Button>
              {status === "scheduled" && (
                <Button
                  disabled={acting}
                  onClick={() => run(confirm, t("appointment.toasts.confirmed"))}
                >
                  {tc("actions.confirm")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      )}

      {rescheduling && (
        <RescheduleAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setRescheduling(false);
          }}
          appointmentUuid={item.id}
          startsAt={startsAt}
          memberId={item.member?.id ?? ""}
        />
      )}
      {canceling && (
        <CancelAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setCanceling(false);
          }}
          appointmentUuid={item.id}
        />
      )}
    </>
  );
}

function CallbackDetail({
  event,
  item,
}: {
  event: GridEvent;
  item: Extract<SystemCalendarItem, { type: "callback" }>;
}) {
  const t = useTranslations("calendar.detail");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const enabled = useModuleEnabled("callbacks");
  const detailQuery = useCallbackDetail(business.id, enabled ? item.id : null);
  const callback = detailQuery.data;

  const [rescheduling, setRescheduling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [openedAtMs] = useState(() => Date.now());

  const status = callback?.status ?? item.status;
  const open = (OPEN_CALLBACK_STATUSES as readonly string[]).includes(status);
  const overdue =
    callback?.overdue ?? (status === "scheduled" && Date.parse(item.starts_at) < openedAtMs);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {callback && <CallbackTypeIcon type={callback.type} />}
          {item.title}
        </DialogTitle>
        <DialogDescription>
          <WhenText event={event} timeZone={business.timezone} />
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-1.5">
        <CallbackStatusBadge status={status} />
        {overdue && status === "scheduled" && <OverdueBadge />}
        {callback && <Badge variant="outline">{CALLBACK_TYPE_LABELS[callback.type]}</Badge>}
      </div>

      <div className="flex flex-col gap-2">
        <DetailRow label={t("contact")}>
          {item.contact ? (
            <Link
              href={`/b/${business.id}/contacts?contact=${item.contact.id}`}
              className="text-primary hover:underline"
            >
              {item.contact.name}
            </Link>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label={t("assignee")}>{item.member?.name ?? t("unassigned")}</DetailRow>
        {enabled && detailQuery.isPending && <Skeleton className="h-4 w-full" />}
        {callback && (
          <DetailRow label={t("callback.number")}>
            <span dir="ltr">{formatE164(callback.to_e164)}</span>
          </DetailRow>
        )}
        {callback?.topic && <DetailRow label={t("callback.topic")}>{callback.topic}</DetailRow>}
        {callback?.notes && <DetailRow label={tc("labels.notes")}>{callback.notes}</DetailRow>}
      </div>

      {!enabled && (
        <p className="text-sm text-muted-foreground">{t("callback.moduleDisabled")}</p>
      )}

      {enabled && (
        <DialogFooter className="flex-wrap">
          <Button
            variant="ghost"
            className="me-auto px-2"
            render={<Link href={`/b/${business.id}/calls/callbacks?callback=${item.id}`} />}
          >
            {t("callback.open")}
            <ArrowUpRightIcon className="rtl:-scale-x-100" />
          </Button>
          {callback && open && (
            <>
              <Button variant="destructive-outline" onClick={() => setCanceling(true)}>
                {t("callback.cancel")}
              </Button>
              {status === "scheduled" && (
                <Button variant="outline" onClick={() => setRescheduling(true)}>
                  {t("reschedule")}
                </Button>
              )}
              <Button variant="success" onClick={() => setCompleting(true)}>
                {t("complete")}
              </Button>
            </>
          )}
        </DialogFooter>
      )}

      {callback && rescheduling && (
        <RescheduleCallbackDialog
          open
          onOpenChange={(next) => {
            if (!next) setRescheduling(false);
          }}
          businessUuid={business.id}
          callback={callback}
        />
      )}
      {callback && completing && (
        <CompleteCallbackDialog
          open
          onOpenChange={(next) => {
            if (!next) setCompleting(false);
          }}
          businessUuid={business.id}
          callback={callback}
        />
      )}
      {callback && (
        <CancelCallbackDialog
          businessUuid={business.id}
          callback={canceling ? callback : null}
          onOpenChange={(next: boolean) => {
            if (!next) setCanceling(false);
          }}
        />
      )}
    </>
  );
}

function JobDetail({
  event,
  item,
}: {
  event: GridEvent;
  item: Extract<SystemCalendarItem, { type: "job" }>;
}) {
  const t = useTranslations("calendar.detail");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const enabled = useModuleEnabled("jobs");
  const detailQuery = useJobDetail(business.id, enabled ? item.id : null);
  const job = detailQuery.data;

  const startJob = useStartJob(business.id);
  const completeJob = useCompleteJob(business.id);
  const [rescheduling, setRescheduling] = useState(false);

  const status = job?.status ?? item.status;
  const scheduled = status === "scheduled";
  const inProgress = status === "in_progress";
  const acting = startJob.isPending || completeJob.isPending;

  const run = (mutation: typeof startJob, successMessage: string) =>
    mutation.mutate(item.id, {
      onSuccess: () => toast.success(successMessage),
      onError: (error) => toast.error(error.message),
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>
          <WhenText event={event} timeZone={business.timezone} />
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-1.5">
        <JobStatusBadge status={status} />
        {job && <JobPriorityBadge priority={job.priority} />}
        {job && <Badge variant="outline">{JOB_SOURCE_LABELS[job.source]}</Badge>}
      </div>

      <div className="flex flex-col gap-2">
        <DetailRow label={t("contact")}>
          {item.contact ? (
            <Link
              href={`/b/${business.id}/contacts?contact=${item.contact.id}`}
              className="text-primary hover:underline"
            >
              {item.contact.name}
            </Link>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label={t("assignee")}>{item.member?.name ?? t("unassigned")}</DetailRow>
        {enabled && detailQuery.isPending && <Skeleton className="h-4 w-full" />}
        {job?.description && (
          <DetailRow label={tc("labels.description")}>{job.description}</DetailRow>
        )}
      </div>

      {!enabled && <p className="text-sm text-muted-foreground">{t("job.moduleDisabled")}</p>}

      {enabled && (
        <DialogFooter className="flex-wrap">
          <Button
            variant="ghost"
            className="me-auto px-2"
            render={<Link href={`/b/${business.id}/jobs?job=${item.id}`} />}
          >
            {t("job.open")}
            <ArrowUpRightIcon className="rtl:-scale-x-100" />
          </Button>
          {job && (scheduled || inProgress) && (
            <>
              <Button variant="outline" disabled={acting} onClick={() => setRescheduling(true)}>
                {t("reschedule")}
              </Button>
              {scheduled ? (
                <>
                  <Button
                    variant="success"
                    disabled={acting}
                    onClick={() =>
                      run(completeJob, t("job.toasts.completed", { reference: job.reference }))
                    }
                  >
                    {t("complete")}
                  </Button>
                  <Button
                    disabled={acting}
                    onClick={() =>
                      run(startJob, t("job.toasts.started", { reference: job.reference }))
                    }
                  >
                    {t("job.start")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="success"
                  disabled={acting}
                  onClick={() =>
                    run(completeJob, t("job.toasts.completed", { reference: job.reference }))
                  }
                >
                  {t("job.complete")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      )}

      {job && rescheduling && (
        <ScheduleJobDialog
          open
          onOpenChange={(next) => {
            if (!next) setRescheduling(false);
          }}
          job={job}
        />
      )}
    </>
  );
}

function ExternalDetail({ event }: { event: GridEvent }) {
  const t = useTranslations("calendar.detail.external");
  const { business } = useBusiness();
  const external = event.external;
  if (!external) return null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{external.title}</DialogTitle>
        <DialogDescription>
          {external.all_day ? (
            t("allDay")
          ) : (
            <WhenText event={event} timeZone={business.timezone} />
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-1.5">
        {event.kind === "external-ours" ? (
          <Badge variant="info">{t("ourBooking")}</Badge>
        ) : (
          <Badge variant="outline">Outlook</Badge>
        )}
        <Badge variant={external.busy ? "secondary" : "ghost"}>
          {external.busy ? t("busy") : t("free")}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {external.location && (
          <DetailRow label={t("location")}>{external.location}</DetailRow>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {event.kind === "external-ours" ? t("oursNote") : t("externalNote")}
      </p>
    </>
  );
}

/** Click-through for any grid event; content switches on the event's kind. */
export function EventDetailDialog({
  event,
  onClose,
}: {
  event: GridEvent | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={event !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {event?.item?.type === "appointment" && (
          <AppointmentDetail event={event} item={event.item} />
        )}
        {event?.item?.type === "callback" && <CallbackDetail event={event} item={event.item} />}
        {event?.item?.type === "job" && <JobDetail event={event} item={event.item} />}
        {(event?.kind === "external" || event?.kind === "external-ours") && (
          <ExternalDetail event={event} />
        )}
      </DialogContent>
    </Dialog>
  );
}
