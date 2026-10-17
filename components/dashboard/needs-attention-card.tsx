"use client";

import Link from "next/link";
import {
  AlarmClockIcon,
  CalendarClockIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  FileTextIcon,
  ReceiptTextIcon,
  TargetIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import { useAppointmentCounts } from "@/hooks/use-appointments";
import { useCallbackCounts } from "@/hooks/use-callbacks";
import { useInvoiceCounts } from "@/hooks/use-invoices";
import { useJobCounts } from "@/hooks/use-jobs";
import { useLeadCounts } from "@/hooks/use-leads";
import { useQuoteCounts } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "destructive";

const TONE: Record<Tone, string> = {
  info: "bg-info/10 text-info dark:bg-info/20",
  warning: "bg-warning/10 text-warning dark:bg-warning/20",
  destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

interface AttentionItem {
  key: string;
  count: number;
  label: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
}

function plural(count: number, noun: string): string {
  return `${noun}${count === 1 ? "" : "s"}`;
}

/**
 * The cross-module worklist: everything that wants a human, ranked hard
 * problems first. Rows only exist for enabled modules with a non-zero count.
 */
export function NeedsAttentionCard({ className }: { className?: string }) {
  const { business } = useBusiness();
  const base = `/b/${business.id}`;

  const appointmentsOn = useModuleEnabled("appointments");
  const callbacksOn = useModuleEnabled("callbacks");
  const invoicesOn = useModuleEnabled("invoices");
  const leadsOn = useModuleEnabled("leads");
  const jobsOn = useModuleEnabled("jobs");
  const quotesOn = useModuleEnabled("quotes");

  const appointments = useAppointmentCounts(business.id, { enabled: appointmentsOn });
  const callbacks = useCallbackCounts(business.id, { enabled: callbacksOn });
  const invoices = useInvoiceCounts(business.id, { enabled: invoicesOn });
  const leads = useLeadCounts(business.id, { enabled: leadsOn });
  const jobs = useJobCounts(business.id, { enabled: jobsOn });
  const quotes = useQuoteCounts(business.id, { enabled: quotesOn });

  // A disabled query stays "pending" forever — only enabled ones count.
  const loading =
    (appointmentsOn && appointments.isPending) ||
    (callbacksOn && callbacks.isPending) ||
    (invoicesOn && invoices.isPending) ||
    (leadsOn && leads.isPending) ||
    (jobsOn && jobs.isPending) ||
    (quotesOn && quotes.isPending);

  const items: AttentionItem[] = [];

  if (callbacks.data && callbacks.data.overdue > 0) {
    items.push({
      key: "callbacks-overdue",
      count: callbacks.data.overdue,
      label: `${plural(callbacks.data.overdue, "callback")} overdue`,
      href: `${base}/calls/callbacks`,
      icon: AlarmClockIcon,
      tone: "destructive",
    });
  }
  if (invoices.data && invoices.data.overdue > 0) {
    items.push({
      key: "invoices-overdue",
      count: invoices.data.overdue,
      label: `${plural(invoices.data.overdue, "invoice")} overdue · ${formatCents(invoices.data.overdue_cents)}`,
      href: `${base}/invoices`,
      icon: ReceiptTextIcon,
      tone: "destructive",
    });
  }
  if (jobs.data && jobs.data.high_priority_active > 0) {
    items.push({
      key: "jobs-high",
      count: jobs.data.high_priority_active,
      label: `high-priority ${plural(jobs.data.high_priority_active, "job")} open`,
      href: `${base}/jobs`,
      icon: WrenchIcon,
      tone: "destructive",
    });
  }
  if (appointments.data && appointments.data.needs_review > 0) {
    items.push({
      key: "appointments-review",
      count: appointments.data.needs_review,
      label: `${plural(appointments.data.needs_review, "appointment")} to review`,
      href: `${base}/appointments`,
      icon: CalendarClockIcon,
      tone: "warning",
    });
  }
  if (quotes.data && quotes.data.expiring_soon > 0) {
    items.push({
      key: "quotes-expiring",
      count: quotes.data.expiring_soon,
      label: `${plural(quotes.data.expiring_soon, "quote")} expiring soon`,
      href: `${base}/quotes`,
      icon: FileTextIcon,
      tone: "warning",
    });
  }
  if (leads.data && leads.data.new > 0) {
    items.push({
      key: "leads-new",
      count: leads.data.new,
      label: `new ${plural(leads.data.new, "lead")} to action`,
      href: `${base}/leads`,
      icon: TargetIcon,
      tone: "info",
    });
  }
  if (callbacks.data && callbacks.data.due_today > 0) {
    items.push({
      key: "callbacks-today",
      count: callbacks.data.due_today,
      label: `${plural(callbacks.data.due_today, "callback")} due today`,
      href: `${base}/calls/callbacks`,
      icon: AlarmClockIcon,
      tone: "info",
    });
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>Where a human makes the difference</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-success/10 text-success dark:bg-success/20">
              <CircleCheckBigIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">
                Nothing needs your attention right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="-mx-2 flex flex-col">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    TONE[item.tone]
                  )}
                >
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0 truncate text-sm">
                  <span className="font-semibold tabular-nums">{item.count}</span>{" "}
                  {item.label}
                </span>
                <ChevronRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
