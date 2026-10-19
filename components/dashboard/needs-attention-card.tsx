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
import { useTranslations } from "next-intl";
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
  /** Pluralized message with the count wrapped in <num> for emphasis. */
  label: React.ReactNode;
  href: string;
  icon: LucideIcon;
  tone: Tone;
}

/** Renderer for the <num> tag: the bold count leading each row. */
function emphasizeCount(chunks: React.ReactNode) {
  return <span className="font-semibold tabular-nums">{chunks}</span>;
}

/**
 * The cross-module worklist: everything that wants a human, ranked hard
 * problems first. Rows only exist for enabled modules with a non-zero count.
 */
export function NeedsAttentionCard({ className }: { className?: string }) {
  const t = useTranslations("dashboard.needsAttention");
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
      label: t.rich("callbacksOverdue", {
        count: callbacks.data.overdue,
        num: emphasizeCount,
      }),
      href: `${base}/calls/callbacks`,
      icon: AlarmClockIcon,
      tone: "destructive",
    });
  }
  if (invoices.data && invoices.data.overdue > 0) {
    items.push({
      key: "invoices-overdue",
      label: t.rich("invoicesOverdue", {
        count: invoices.data.overdue,
        amount: formatCents(invoices.data.overdue_cents),
        num: emphasizeCount,
      }),
      href: `${base}/invoices`,
      icon: ReceiptTextIcon,
      tone: "destructive",
    });
  }
  if (jobs.data && jobs.data.high_priority_active > 0) {
    items.push({
      key: "jobs-high",
      label: t.rich("jobsHighPriority", {
        count: jobs.data.high_priority_active,
        num: emphasizeCount,
      }),
      href: `${base}/jobs`,
      icon: WrenchIcon,
      tone: "destructive",
    });
  }
  if (appointments.data && appointments.data.needs_review > 0) {
    items.push({
      key: "appointments-review",
      label: t.rich("appointmentsToReview", {
        count: appointments.data.needs_review,
        num: emphasizeCount,
      }),
      href: `${base}/appointments`,
      icon: CalendarClockIcon,
      tone: "warning",
    });
  }
  if (quotes.data && quotes.data.expiring_soon > 0) {
    items.push({
      key: "quotes-expiring",
      label: t.rich("quotesExpiring", {
        count: quotes.data.expiring_soon,
        num: emphasizeCount,
      }),
      href: `${base}/quotes`,
      icon: FileTextIcon,
      tone: "warning",
    });
  }
  if (leads.data && leads.data.new > 0) {
    items.push({
      key: "leads-new",
      label: t.rich("leadsNew", { count: leads.data.new, num: emphasizeCount }),
      href: `${base}/leads`,
      icon: TargetIcon,
      tone: "info",
    });
  }
  if (callbacks.data && callbacks.data.due_today > 0) {
    items.push({
      key: "callbacks-today",
      label: t.rich("callbacksDueToday", {
        count: callbacks.data.due_today,
        num: emphasizeCount,
      }),
      href: `${base}/calls/callbacks`,
      icon: AlarmClockIcon,
      tone: "info",
    });
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
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
              <p className="text-sm font-medium">{t("allClear")}</p>
              <p className="text-xs text-muted-foreground">{t("allClearDescription")}</p>
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
                <span className="min-w-0 truncate text-sm">{item.label}</span>
                <ChevronRightIcon className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
