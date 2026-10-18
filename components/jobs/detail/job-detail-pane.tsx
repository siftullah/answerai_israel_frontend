"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BanIcon,
  CalendarClockIcon,
  CheckIcon,
  PencilIcon,
  PlayIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  Trash2Icon,
  UserRoundIcon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import { CancelJobDialog } from "@/components/jobs/cancel-job-dialog";
import { ConvertJobToInvoiceDialog } from "@/components/jobs/convert-job-to-invoice-dialog";
import { DeleteJobDialog } from "@/components/jobs/delete-job-dialog";
import { JobFormDialog } from "@/components/jobs/job-form-dialog";
import { JobLineItemsDialog } from "@/components/jobs/job-line-items-dialog";
import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-status-badge";
import { ReopenJobDialog } from "@/components/jobs/reopen-job-dialog";
import { ScheduleJobDialog } from "@/components/jobs/schedule-job-dialog";
import { JobActivityTimeline } from "@/components/jobs/detail/job-activity-timeline";
import { JobLineItemsCard } from "@/components/jobs/detail/job-line-items-card";
import { JobPhotosCard } from "@/components/jobs/detail/job-photos-card";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { useCompleteJob, useJobDetail, useStartJob } from "@/hooks/use-jobs";
import { formatDate, formatDateTime, formatTimeOfDay } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import type { Job, JobServiceAddress } from "@/lib/api/types";
import { JOB_SOURCE_LABELS } from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="mb-3 self-start lg:hidden" onClick={onBack}>
      <ArrowLeftIcon />
      All jobs
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

function formatAddress(address: JobServiceAddress): string {
  return [
    address.line1,
    address.line2,
    [address.city, address.region, address.postal_code].filter(Boolean).join(" "),
  ]
    .filter((part) => part && String(part).trim() !== "")
    .join(", ");
}

/** "28 Jul 2026, 9:00 am – 10:30 am" — visits never span days, so one date. */
function visitWindow(job: Job, timeZone: string): string | null {
  if (!job.scheduled_start) return null;
  const start = formatDateTime(job.scheduled_start, timeZone);
  if (!job.scheduled_end) return start;
  return `${start} – ${formatTimeOfDay(job.scheduled_end, timeZone)}`;
}

function MetaBand({
  businessUuid,
  job,
  timeZone,
}: {
  businessUuid: string;
  job: Job;
  timeZone: string;
}) {
  // A minute-resolution "now" so the overdue flag stays honest over time
  // without impure clock reads during render.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const window = visitWindow(job, timeZone);
  const overdueVisit =
    job.status === "scheduled" &&
    job.scheduled_end !== null &&
    new Date(job.scheduled_end).getTime() < nowMs;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label="Customer">
        {job.contact ? (
          <Link
            href={`/b/${businessUuid}/contacts/${job.contact.id}`}
            className="text-primary hover:underline"
          >
            {job.contact.name ?? "Unnamed contact"}
          </Link>
        ) : (
          "—"
        )}
      </Meta>
      <Meta label="Visit">
        {window ? (
          <span className={overdueVisit ? "text-warning" : undefined}>{window}</span>
        ) : (
          "Not booked yet"
        )}
      </Meta>
      <Meta label="Quoted value">
        {job.quote_cents !== null
          ? formatCents(job.quote_cents, job.currency ?? "ILS")
          : "Not priced yet"}
      </Meta>
      <Meta label="Assignee">{job.assignee?.name ?? "Unassigned"}</Meta>
      <Meta label="Source">{JOB_SOURCE_LABELS[job.source]}</Meta>
      {job.estimated_minutes !== null && (
        <Meta label="Estimated duration">{job.estimated_minutes} min</Meta>
      )}
      {job.service_address && <Meta label="Site address">{formatAddress(job.service_address)}</Meta>}
      {job.lead && (
        <Meta label="From lead">
          <Link
            href={`/b/${businessUuid}/leads?lead=${job.lead.id}`}
            className="text-primary hover:underline"
          >
            {job.lead.title}
          </Link>
        </Meta>
      )}
      {job.quote && (
        <Meta label="From quote">
          <Link
            href={`/b/${businessUuid}/quotes?quote=${job.quote.id}`}
            className="text-primary hover:underline"
          >
            {job.quote.title ?? `Quote ${job.quote.number}`}
          </Link>
        </Meta>
      )}
      {job.call && (
        <Meta label="Captured on">
          <Link
            href={`/b/${businessUuid}/calls/${job.call.id}`}
            className="text-primary hover:underline"
          >
            {job.call.summary_title ?? `Call ${formatDate(job.call.created_at, timeZone)}`}
          </Link>
        </Meta>
      )}
      {job.completed_at && <Meta label="Completed">{formatDateTime(job.completed_at, timeZone)}</Meta>}
      {job.canceled_at && (
        <Meta label="Canceled">
          {formatDateTime(job.canceled_at, timeZone)}
          {job.canceled_reason && (
            <span className="block text-xs font-normal text-muted-foreground">
              {job.canceled_reason}
            </span>
          )}
        </Meta>
      )}
      <Meta label="Created">{formatDate(job.created_at, timeZone)}</Meta>
    </dl>
  );
}

export function JobDetailPane({
  businessUuid,
  jobUuid,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  jobUuid: string | null;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const { business } = useBusiness();
  const jobQuery = useJobDetail(businessUuid, jobUuid);
  const startJob = useStartJob(businessUuid);
  const completeJob = useCompleteJob(businessUuid);
  const invoicesEnabled = useModuleEnabled("invoices");

  const [editing, setEditing] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (jobUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WrenchIcon />
          </EmptyMedia>
          <EmptyTitle>No job selected</EmptyTitle>
          <EmptyDescription>Select a job to see its details and history.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (jobQuery.isPending) {
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

  if (jobQuery.isError) {
    const notFound = jobQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? "Job not found" : "Couldn't load this job"}
          message={notFound ? "This job doesn't exist or was removed." : jobQuery.error.message}
          onRetry={notFound ? onClearSelection : () => jobQuery.refetch()}
        />
      </div>
    );
  }

  const job = jobQuery.data;
  const open = job.status === "open";
  const scheduled = job.status === "scheduled";
  const inProgress = job.status === "in_progress";
  const active = open || scheduled || inProgress;
  const closed = job.status === "completed" || job.status === "canceled";
  const liveInvoice = (job.invoices ?? []).find((invoice) => invoice.status !== "void");
  const transitioning = startJob.isPending || completeJob.isPending;

  const start = () =>
    startJob.mutate(job.id, {
      onSuccess: () => toast.success(`${job.reference} started`),
      onError: (error) => toast.error(error.message),
    });

  const complete = () =>
    completeJob.mutate(job.id, {
      onSuccess: () => toast.success(`${job.reference} completed — ready to invoice`),
      onError: (error) => toast.error(error.message),
    });

  return (
    <div key={job.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-4">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-4 pb-6">
            {/* Identity + status */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="max-w-full truncate font-heading text-2xl font-semibold">
                    {job.title}
                  </h2>
                  <JobStatusBadge status={job.status} />
                  <JobPriorityBadge priority={job.priority} />
                  {job.source === "agent_call" && <Badge variant="outline">From a call</Badge>}
                  {liveInvoice && <Badge variant="outline">Invoiced as {liveInvoice.number}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="tabular-nums">{job.reference}</span>
                  {job.quote_cents !== null
                    ? ` · ${formatCents(job.quote_cents, job.currency ?? "ILS")}`
                    : ""}
                  {job.assignee ? ` · ${job.assignee.name}` : ""}
                </p>
              </div>
              {job.contact && (
                <Button
                  variant="cta"
                  size="sm"
                  render={<Link href={`/b/${businessUuid}/contacts/${job.contact.id}`} />}
                >
                  <UserRoundIcon />
                  View contact
                </Button>
              )}
            </div>

            <MetaBand businessUuid={businessUuid} job={job} timeZone={business.timezone} />

            <div className="flex flex-wrap gap-2">
              {open && (
                <Button size="sm" onClick={() => setScheduling(true)}>
                  <CalendarClockIcon />
                  Schedule visit
                </Button>
              )}
              {scheduled && (
                <Button size="sm" disabled={transitioning} onClick={start}>
                  <PlayIcon />
                  Start job
                </Button>
              )}
              {open && (
                <Button size="sm" variant="outline" disabled={transitioning} onClick={start}>
                  <PlayIcon />
                  Start now
                </Button>
              )}
              {inProgress && (
                <Button size="sm" disabled={transitioning} onClick={complete}>
                  <CheckIcon />
                  Complete job
                </Button>
              )}
              {(open || scheduled) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                  disabled={transitioning}
                  onClick={complete}
                >
                  <CheckIcon />
                  Mark completed
                </Button>
              )}
              {(scheduled || inProgress) && (
                <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>
                  <CalendarClockIcon />
                  Reschedule
                </Button>
              )}
              {job.status === "completed" && invoicesEnabled && !liveInvoice && (
                <Button size="sm" onClick={() => setInvoicing(true)}>
                  <ReceiptTextIcon />
                  Create invoice
                </Button>
              )}
              {job.status === "completed" && liveInvoice && (
                <Button
                  size="sm"
                  variant="cta"
                  render={<Link href={`/b/${businessUuid}/invoices?invoice=${liveInvoice.id}`} />}
                >
                  <ReceiptTextIcon />
                  View invoice
                </Button>
              )}
              {closed && (
                <Button size="sm" variant="outline" onClick={() => setReopening(true)}>
                  <RotateCcwIcon />
                  Reopen
                </Button>
              )}
              {active && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <PencilIcon />
                  Edit
                </Button>
              )}
              {active && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCanceling(true)}
                >
                  <BanIcon />
                  Cancel job
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleting(true)}
              >
                <Trash2Icon />
                Delete
              </Button>
            </div>
          </div>

          {job.description && (
            <DetailCard title="Description">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.description}</p>
            </DetailCard>
          )}

          <JobLineItemsCard
            job={job}
            onEdit={job.status !== "canceled" ? () => setEditingItems(true) : undefined}
          />

          <JobPhotosCard businessUuid={businessUuid} jobUuid={job.id} />

          <JobActivityTimeline
            businessUuid={businessUuid}
            jobUuid={job.id}
            timeZone={business.timezone}
          />
        </div>
      </div>

      {editing && (
        <JobFormDialog
          open
          job={job}
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
        />
      )}
      {editingItems && (
        <JobLineItemsDialog
          open
          job={job}
          onOpenChange={(next) => {
            if (!next) setEditingItems(false);
          }}
        />
      )}
      {scheduling && (
        <ScheduleJobDialog
          open
          job={job}
          onOpenChange={(next) => {
            if (!next) setScheduling(false);
          }}
        />
      )}
      {canceling && (
        <CancelJobDialog
          open
          businessUuid={businessUuid}
          job={job}
          onOpenChange={(next) => {
            if (!next) setCanceling(false);
          }}
        />
      )}
      {reopening && (
        <ReopenJobDialog
          businessUuid={businessUuid}
          job={job}
          onOpenChange={(next) => {
            if (!next) setReopening(false);
          }}
        />
      )}
      {invoicing && (
        <ConvertJobToInvoiceDialog
          businessUuid={businessUuid}
          job={job}
          onOpenChange={(next) => {
            if (!next) setInvoicing(false);
          }}
        />
      )}
      {deleting && (
        <DeleteJobDialog
          businessUuid={businessUuid}
          job={job}
          onOpenChange={(next) => {
            if (!next) setDeleting(false);
          }}
          onDeleted={onClearSelection}
        />
      )}
    </div>
  );
}
