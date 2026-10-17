"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { useBusiness } from "@/components/business/business-provider";
import { useCallRelated } from "@/hooks/use-calls";
import { formatDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";

function Group({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
        >
          Open
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </div>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

function Item({
  primary,
  secondary,
  href,
}: {
  primary: string;
  secondary?: string | null;
  href?: string;
}) {
  const content = (
    <>
      <span className="min-w-0 truncate text-sm">{primary}</span>
      {secondary && (
        <Badge variant="outline" className="shrink-0">
          {secondary}
        </Badge>
      )}
    </>
  );

  if (href) {
    return (
      <li>
        <Link
          href={href}
          className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5 transition-colors hover:bg-muted"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
      {content}
    </li>
  );
}

function humanizeStatus(status: string): string {
  const spaced = status.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * What this call produced: appointments, leads, jobs, invoices, and callbacks
 * (scheduled on this call, or fulfilled by it). Absent keys = disabled
 * modules; the section hides entirely when nothing is present.
 */
export function CallRelatedSection({
  businessUuid,
  callUuid,
  enabled,
}: {
  businessUuid: string;
  callUuid: string;
  enabled: boolean;
}) {
  const { business } = useBusiness();
  const related = useCallRelated(businessUuid, callUuid, enabled);

  if (!enabled || related.isError) return null;

  if (related.isPending) {
    return (
      <DetailCard title="Created from this call">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </DetailCard>
    );
  }

  const data = related.data;
  const callbacks = [
    ...(data.callbacks?.originated ?? []),
    ...(data.callbacks?.resulted ?? []).map((callback) => ({ ...callback, fulfilled: true })),
  ];

  const empty =
    !data.appointments?.length &&
    !data.leads?.length &&
    !data.jobs?.length &&
    !data.invoices?.length &&
    callbacks.length === 0;

  if (empty) return null;

  const base = `/b/${businessUuid}`;

  return (
    <DetailCard
      title="Created from this call"
      description="Records the agent created or fulfilled during this conversation."
    >
      <div className="flex flex-col gap-4">
        {!!data.appointments?.length && (
          <Group title="Appointments" href={`${base}/appointments`}>
            {data.appointments.map((appointment) => (
              <Item
                key={appointment.id}
                primary={formatDateTime(appointment.starts_at, business.timezone)}
                secondary={humanizeStatus(appointment.status)}
                href={`${base}/appointments?appointment=${appointment.id}`}
              />
            ))}
          </Group>
        )}
        {!!data.leads?.length && (
          <Group title="Leads" href={`${base}/leads`}>
            {data.leads.map((lead) => (
              <Item
                key={lead.id}
                primary={
                  lead.value_cents !== null
                    ? `${lead.title} — ${formatCents(lead.value_cents)}`
                    : lead.title
                }
                secondary={humanizeStatus(lead.status)}
                href={`${base}/leads?lead=${lead.id}`}
              />
            ))}
          </Group>
        )}
        {!!data.jobs?.length && (
          <Group title="Jobs" href={`${base}/jobs`}>
            {data.jobs.map((job) => (
              <Item
                key={job.id}
                primary={`${job.reference} — ${job.title}`}
                secondary={humanizeStatus(job.status)}
                href={`${base}/jobs?job=${job.id}`}
              />
            ))}
          </Group>
        )}
        {!!data.invoices?.length && (
          <Group title="Invoices" href={`${base}/invoices`}>
            {data.invoices.map((invoice) => (
              <Item
                key={invoice.id}
                primary={`${invoice.number} — ${formatCents(invoice.total_cents)}`}
                secondary={humanizeStatus(invoice.status)}
              />
            ))}
          </Group>
        )}
        {callbacks.length > 0 && (
          <Group title="Callbacks" href={`${base}/calls/callbacks`}>
            {callbacks.map((callback) => (
              <Item
                key={callback.id}
                href={`${base}/calls/callbacks?callback=${callback.id}`}
                primary={
                  "fulfilled" in callback && callback.fulfilled
                    ? `Fulfilled a callback scheduled for ${formatDateTime(callback.scheduled_at, business.timezone)}`
                    : `Scheduled for ${formatDateTime(callback.scheduled_at, business.timezone)}`
                }
                secondary={humanizeStatus(callback.status)}
              />
            ))}
          </Group>
        )}
      </div>
    </DetailCard>
  );
}
