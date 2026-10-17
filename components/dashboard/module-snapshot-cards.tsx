"use client";

import Link from "next/link";
import {
  ArrowUpRightIcon,
  FileTextIcon,
  ReceiptTextIcon,
  TargetIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import { useInvoiceCounts } from "@/hooks/use-invoices";
import { useJobCounts } from "@/hooks/use-jobs";
import { useLeadCounts } from "@/hooks/use-leads";
import { useQuoteCounts } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

function SnapshotCard({
  title,
  icon: Icon,
  href,
  money,
  moneyLabel,
  foot,
  loading,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  money: number | undefined;
  moneyLabel: string;
  foot: React.ReactNode;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-[132px] w-full rounded-2xl" />;
  }

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-semibold">{title}</span>
        <ArrowUpRightIcon className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
          {money !== undefined ? formatCents(money) : "—"}
        </span>
        <span className="text-xs text-muted-foreground">{moneyLabel}</span>
      </div>
      <div className="text-xs text-muted-foreground">{foot}</div>
    </Link>
  );
}

/**
 * One money-first card per enabled pipeline module. These share query keys
 * with each module's own page, so the dashboard never double-fetches.
 */
export function ModuleSnapshotCards() {
  const { business } = useBusiness();
  const base = `/b/${business.id}`;

  const leadsOn = useModuleEnabled("leads");
  const quotesOn = useModuleEnabled("quotes");
  const jobsOn = useModuleEnabled("jobs");
  const invoicesOn = useModuleEnabled("invoices");

  const leads = useLeadCounts(business.id, { enabled: leadsOn });
  const quotes = useQuoteCounts(business.id, { enabled: quotesOn });
  const jobs = useJobCounts(business.id, { enabled: jobsOn });
  const invoices = useInvoiceCounts(business.id, { enabled: invoicesOn });

  const cards: React.ReactNode[] = [];

  if (leadsOn) {
    cards.push(
      <SnapshotCard
        key="leads"
        title="Leads"
        icon={TargetIcon}
        href={`${base}/leads`}
        loading={leads.isPending}
        money={leads.data?.pipeline_value_cents}
        moneyLabel="Open pipeline"
        foot={
          leads.data && (
            <>
              {leads.data.open} open
              {leads.data.new > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-info">{leads.data.new} new</span>
                </>
              )}
            </>
          )
        }
      />
    );
  }

  if (quotesOn) {
    cards.push(
      <SnapshotCard
        key="quotes"
        title="Quotes"
        icon={FileTextIcon}
        href={`${base}/quotes`}
        loading={quotes.isPending}
        money={quotes.data?.open_value_cents}
        moneyLabel="Awaiting response"
        foot={
          quotes.data && (
            <>
              {quotes.data.awaiting} awaiting
              {quotes.data.expiring_soon > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-warning">
                    {quotes.data.expiring_soon} expiring soon
                  </span>
                </>
              )}
            </>
          )
        }
      />
    );
  }

  if (jobsOn) {
    cards.push(
      <SnapshotCard
        key="jobs"
        title="Jobs"
        icon={WrenchIcon}
        href={`${base}/jobs`}
        loading={jobs.isPending}
        money={jobs.data?.active_value_cents}
        moneyLabel="Active value"
        foot={
          jobs.data && (
            <>
              {jobs.data.active} active
              {jobs.data.scheduled_today > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-info">
                    {jobs.data.scheduled_today} today
                  </span>
                </>
              )}
            </>
          )
        }
      />
    );
  }

  if (invoicesOn) {
    cards.push(
      <SnapshotCard
        key="invoices"
        title="Invoices"
        icon={ReceiptTextIcon}
        href={`${base}/invoices`}
        loading={invoices.isPending}
        money={invoices.data?.outstanding_cents}
        moneyLabel="Outstanding"
        foot={
          invoices.data && (
            <>
              {invoices.data.awaiting_payment} awaiting payment
              {invoices.data.overdue > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-destructive">
                    {invoices.data.overdue} overdue
                  </span>
                </>
              )}
            </>
          )
        }
      />
    );
  }

  if (cards.length === 0) return null;

  // Tailwind needs literal class names — no template interpolation.
  const XL_COLS: Record<number, string> = {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
  };

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", XL_COLS[cards.length])}>
      {cards}
    </div>
  );
}
