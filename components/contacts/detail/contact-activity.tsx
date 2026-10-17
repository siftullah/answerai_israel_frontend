"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CallList } from "@/components/calls/list/call-list";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import {
  useContactAppointments,
  useContactInvoices,
  useContactJobs,
  useContactLeads,
} from "@/hooks/use-contact-activity";
import type { Contact } from "@/lib/api/types";
import { formatDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";

function Group({
  title,
  href,
  isPending,
  rows,
}: {
  title: string;
  href: string;
  isPending: boolean;
  rows: { key: string; primary: string; secondary?: string | null; href?: string }[] | null;
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
      {isPending ? (
        <Skeleton className="h-8 w-full" />
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const content = (
              <>
                <span className="min-w-0 truncate text-sm">{row.primary}</span>
                {row.secondary && (
                  <Badge variant="outline" className="shrink-0">
                    {row.secondary}
                  </Badge>
                )}
              </>
            );

            return row.href ? (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5 transition-colors hover:bg-muted"
                >
                  {content}
                </Link>
              </li>
            ) : (
              <li
                key={row.key}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5"
              >
                {content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function humanizeStatus(status: string): string {
  const spaced = status.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Everything tied to this contact: the call history (both directions), and a
 * module-gated card of appointments/leads/jobs/invoices.
 */
export function ContactActivity({ contact }: { contact: Contact }) {
  const { business } = useBusiness();
  const router = useRouter();

  const appointmentsEnabled = useModuleEnabled("appointments");
  const leadsEnabled = useModuleEnabled("leads");
  const jobsEnabled = useModuleEnabled("jobs");
  const invoicesEnabled = useModuleEnabled("invoices");

  const appointments = useContactAppointments(business.id, contact.id, appointmentsEnabled);
  const leads = useContactLeads(business.id, contact.id, leadsEnabled);
  const jobs = useContactJobs(business.id, contact.id, jobsEnabled);
  const invoices = useContactInvoices(business.id, contact.id, invoicesEnabled);

  const anyModule = appointmentsEnabled || leadsEnabled || jobsEnabled || invoicesEnabled;
  const base = `/b/${business.id}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      {anyModule && (
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <p className="font-medium">Related records</p>
          {appointmentsEnabled && (
            <Group
              title="Appointments"
              href={`${base}/appointments`}
              isPending={appointments.isPending}
              rows={
                appointments.data?.map((appointment) => ({
                  key: appointment.id,
                  primary: formatDateTime(appointment.starts_at, business.timezone),
                  secondary: humanizeStatus(appointment.status),
                })) ?? null
              }
            />
          )}
          {leadsEnabled && (
            <Group
              title="Leads"
              href={`${base}/leads`}
              isPending={leads.isPending}
              rows={
                leads.data?.map((lead) => ({
                  key: lead.id,
                  primary:
                    lead.value_cents !== null
                      ? `${lead.title} — ${formatCents(lead.value_cents)}`
                      : lead.title,
                  secondary: humanizeStatus(lead.status),
                  href: `${base}/leads?lead=${lead.id}`,
                })) ?? null
              }
            />
          )}
          {jobsEnabled && (
            <Group
              title="Jobs"
              href={`${base}/jobs`}
              isPending={jobs.isPending}
              rows={
                jobs.data?.map((job) => ({
                  key: job.id,
                  primary: `${job.reference} — ${job.title}`,
                  secondary: humanizeStatus(job.status),
                  href: `${base}/jobs?job=${job.id}`,
                })) ?? null
              }
            />
          )}
          {invoicesEnabled && (
            <Group
              title="Invoices"
              href={`${base}/invoices`}
              isPending={invoices.isPending}
              rows={
                invoices.data?.map((invoice) => ({
                  key: invoice.id,
                  primary: `${invoice.number} — ${formatCents(invoice.total_cents)}`,
                  secondary: humanizeStatus(invoice.status),
                })) ?? null
              }
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="font-medium">Calls</p>
        <CallList
          businessUuid={business.id}
          filters={{ contact_id: contact.id }}
          selectedId={null}
          onSelect={(call) => router.push(`/b/${business.id}/calls/${call.id}`)}
          emptyTitle="No calls yet"
          emptyDescription="Inbound and outbound calls with this contact will appear here."
        />
      </div>
    </div>
  );
}
