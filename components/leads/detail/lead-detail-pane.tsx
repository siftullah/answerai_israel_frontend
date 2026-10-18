"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  FileTextIcon,
  PencilIcon,
  PhoneIcon,
  RotateCcwIcon,
  TargetIcon,
  Trash2Icon,
  UserRoundIcon,
  WrenchIcon,
  XIcon,
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
import { ConvertLeadToJobDialog } from "@/components/leads/convert-lead-to-job-dialog";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadActivityTimeline } from "@/components/leads/detail/lead-activity-timeline";
import { MarkLostLeadDialog } from "@/components/leads/mark-lost-lead-dialog";
import { MarkWonLeadDialog } from "@/components/leads/mark-won-lead-dialog";
import { ReopenLeadDialog } from "@/components/leads/reopen-lead-dialog";
import { useCreateQuoteFromLead, useLeadDetail, useUpdateLead } from "@/hooks/use-leads";
import { dayKey, formatDate, formatDateKey, formatDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/api/types";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, OPEN_LEAD_STATUSES } from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="mb-3 self-start lg:hidden" onClick={onBack}>
      <ArrowLeftIcon />
      All leads
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
  lead,
  timeZone,
}: {
  businessUuid: string;
  lead: Lead;
  timeZone: string;
}) {
  const open = OPEN_LEAD_STATUSES.includes(lead.status);
  const overdue =
    open &&
    lead.expected_close_date !== null &&
    lead.expected_close_date < dayKey(new Date().toISOString(), timeZone);

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label="Contact">
        {lead.contact ? (
          <Link
            href={`/b/${businessUuid}/contacts/${lead.contact.id}`}
            className="text-primary hover:underline"
          >
            {lead.contact.name ?? "Unnamed contact"}
          </Link>
        ) : (
          "—"
        )}
      </Meta>
      <Meta label="Estimated value">
        {lead.value_cents !== null
          ? formatCents(lead.value_cents, lead.currency ?? "ILS")
          : "Not valued yet"}
      </Meta>
      <Meta label="Expected close">
        {lead.expected_close_date ? (
          <span className={overdue ? "text-warning" : undefined}>
            {formatDateKey(lead.expected_close_date)}
          </span>
        ) : (
          "No target date"
        )}
      </Meta>
      <Meta label="Assignee">{lead.assignee?.name ?? "Unassigned"}</Meta>
      <Meta label="Source">{LEAD_SOURCE_LABELS[lead.source]}</Meta>
      {lead.call && (
        <Meta label="Captured on">
          <Link
            href={`/b/${businessUuid}/calls/${lead.call.id}`}
            className="text-primary hover:underline"
          >
            {lead.call.summary_title ?? `Call ${formatDate(lead.call.created_at, timeZone)}`}
          </Link>
        </Meta>
      )}
      {lead.closed_at && (
        <Meta label={lead.status === "won" ? "Won" : "Closed"}>
          {formatDateTime(lead.closed_at, timeZone)}
        </Meta>
      )}
      <Meta label="Created">{formatDate(lead.created_at, timeZone)}</Meta>
    </dl>
  );
}

export function LeadDetailPane({
  businessUuid,
  leadUuid,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  leadUuid: string | null;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const { business } = useBusiness();
  const router = useRouter();
  const leadQuery = useLeadDetail(businessUuid, leadUuid);
  const updateLead = useUpdateLead(businessUuid);
  const createQuote = useCreateQuoteFromLead(businessUuid);
  const quotesEnabled = useModuleEnabled("quotes");
  const jobsEnabled = useModuleEnabled("jobs");

  const [editing, setEditing] = useState(false);
  const [markingWon, setMarkingWon] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (leadUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TargetIcon />
          </EmptyMedia>
          <EmptyTitle>No lead selected</EmptyTitle>
          <EmptyDescription>Select a lead to see its details and history.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (leadQuery.isPending) {
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

  if (leadQuery.isError) {
    const notFound = leadQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? "Lead not found" : "Couldn't load this lead"}
          message={
            notFound ? "This lead doesn't exist or was removed." : leadQuery.error.message
          }
          onRetry={notFound ? onClearSelection : () => leadQuery.refetch()}
        />
      </div>
    );
  }

  const lead = leadQuery.data;
  const open = OPEN_LEAD_STATUSES.includes(lead.status);
  const closed = !open;

  /** Forward moves are low-stakes — no dialog, just the journaled PATCH. */
  const advanceTo = (status: LeadStatus) =>
    updateLead.mutate(
      { id: lead.id, payload: { status } },
      {
        onSuccess: () => toast.success(`Lead marked as ${LEAD_STATUS_LABELS[status].toLowerCase()}`),
        onError: (error) => toast.error(error.message),
      }
    );

  const draftQuote = () =>
    createQuote.mutate(
      { lead },
      {
        onSuccess: (quote) => {
          toast.success(`Draft ${quote.number} created — price it up`);
          router.push(`/b/${businessUuid}/quotes?quote=${quote.id}`);
        },
        onError: (error) => toast.error(error.message),
      }
    );

  return (
    <div key={lead.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-4">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-4 pb-6">
            {/* Identity + status */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="max-w-full truncate font-heading text-2xl font-semibold">
                    {lead.title}
                  </h2>
                  <LeadStatusBadge status={lead.status} />
                  {lead.source === "agent_call" && <Badge variant="outline">From a call</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {lead.value_cents !== null
                    ? formatCents(lead.value_cents, lead.currency ?? "ILS")
                    : "Not valued yet"}
                  {lead.assignee ? ` · ${lead.assignee.name}` : ""}
                </p>
              </div>
              {lead.contact && (
                <Button
                  variant="cta"
                  size="sm"
                  render={<Link href={`/b/${businessUuid}/contacts/${lead.contact.id}`} />}
                >
                  <UserRoundIcon />
                  View contact
                </Button>
              )}
            </div>

            <MetaBand businessUuid={businessUuid} lead={lead} timeZone={business.timezone} />

            <div className="flex flex-wrap gap-2">
              {lead.status === "new" && (
                <Button size="sm" disabled={updateLead.isPending} onClick={() => advanceTo("contacted")}>
                  <PhoneIcon />
                  Mark contacted
                </Button>
              )}
              {lead.status === "contacted" && (
                <Button size="sm" disabled={updateLead.isPending} onClick={() => advanceTo("qualified")}>
                  <TargetIcon />
                  Mark qualified
                </Button>
              )}
              {lead.status === "new" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateLead.isPending}
                  onClick={() => advanceTo("qualified")}
                >
                  Mark qualified
                </Button>
              )}
              {open && (
                <Button
                  size="sm"
                  variant={lead.status === "qualified" ? "default" : "ghost"}
                  className={cn(
                    lead.status !== "qualified" &&
                      "border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                  )}
                  onClick={() => setMarkingWon(true)}
                >
                  <CheckIcon />
                  Mark won
                </Button>
              )}
              {open && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setMarkingLost(true)}
                >
                  <XIcon />
                  Mark lost
                </Button>
              )}
              {closed && (
                <Button size="sm" variant="outline" onClick={() => setReopening(true)}>
                  <RotateCcwIcon />
                  Reopen
                </Button>
              )}
              {quotesEnabled && lead.contact && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={createQuote.isPending}
                  onClick={draftQuote}
                >
                  <FileTextIcon />
                  {createQuote.isPending ? "Creating…" : "Create quote"}
                </Button>
              )}
              {jobsEnabled && (
                <Button size="sm" variant="outline" onClick={() => setConverting(true)}>
                  <WrenchIcon />
                  Convert to job
                </Button>
              )}
              {open && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <PencilIcon />
                  Edit
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

          <LeadActivityTimeline
            businessUuid={businessUuid}
            leadUuid={lead.id}
            timeZone={business.timezone}
          />
        </div>
      </div>

      {editing && (
        <LeadFormDialog
          open
          lead={lead}
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
        />
      )}
      {markingWon && (
        <MarkWonLeadDialog
          businessUuid={businessUuid}
          lead={lead}
          onOpenChange={(next) => {
            if (!next) setMarkingWon(false);
          }}
        />
      )}
      {markingLost && (
        <MarkLostLeadDialog
          open
          businessUuid={businessUuid}
          lead={lead}
          onOpenChange={(next) => {
            if (!next) setMarkingLost(false);
          }}
        />
      )}
      {reopening && (
        <ReopenLeadDialog
          businessUuid={businessUuid}
          lead={lead}
          onOpenChange={(next) => {
            if (!next) setReopening(false);
          }}
        />
      )}
      {converting && (
        <ConvertLeadToJobDialog
          businessUuid={businessUuid}
          lead={lead}
          onOpenChange={(next) => {
            if (!next) setConverting(false);
          }}
        />
      )}
      {deleting && (
        <DeleteLeadDialog
          businessUuid={businessUuid}
          lead={lead}
          onOpenChange={(next) => {
            if (!next) setDeleting(false);
          }}
          onDeleted={onClearSelection}
        />
      )}
    </div>
  );
}
