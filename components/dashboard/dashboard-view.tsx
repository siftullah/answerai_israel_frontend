"use client";

import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { AnswerRateCard } from "@/components/dashboard/answer-rate-card";
import { BusiestHoursCard } from "@/components/dashboard/busiest-hours-card";
import { CallActivityTiles } from "@/components/dashboard/call-activity-tiles";
import { CallVolumeChart } from "@/components/dashboard/call-volume-chart";
import { CapturedCard } from "@/components/dashboard/captured-card";
import { ModuleSnapshotCards } from "@/components/dashboard/module-snapshot-cards";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { RecentCallsCard } from "@/components/dashboard/recent-calls-card";
import { TodayCard } from "@/components/dashboard/today-card";
import { ErrorState } from "@/components/error-state";
import { useDashboard } from "@/hooks/use-dashboard";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import type { DashboardHours } from "@/lib/api/types";

/** "17:00" → "5 pm" / "17:30" → "5:30 pm". Windows are business-local. */
function formatWindowTime(hhmm: string): string {
  const [hour, minute] = hhmm.split(":").map(Number);
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** The business-local wall clock as "HH:MM", comparable to window bounds. */
function businessNowHHMM(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date());
}

function OpenStatusChip({
  hours,
  timeZone,
}: {
  hours: DashboardHours | undefined;
  timeZone: string;
}) {
  if (!hours) return null;

  if (hours.open_now) {
    const now = businessNowHHMM(timeZone);
    const current = hours.today_windows.find((w) => now >= w.start && now < w.end);
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success dark:bg-success/20">
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
        {current ? `Open · closes ${formatWindowTime(current.end)}` : "Open now"}
      </span>
    );
  }

  const now = businessNowHHMM(timeZone);
  const next = hours.today_windows.find((w) => w.start > now);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {next ? `Closed · opens ${formatWindowTime(next.start)}` : "Closed today"}
    </span>
  );
}

function todayLine(timeZone: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date());
}

/**
 * The portal home: today's call activity, the volume trend, the cross-module
 * worklist, today's agenda, and money snapshots per pipeline module. Widgets
 * hide themselves when their module is off, mirroring the sidebar.
 */
export function DashboardView() {
  const { business } = useBusiness();
  // Served from the RequireAuth cache — no extra request.
  const me = useMe();
  const firstName = me.data?.user.first_name;
  const query = useDashboard(business.id);
  const data = query.data;
  const base = `/b/${business.id}`;

  const health = data?.health;
  const healthAlerts: React.ReactNode[] = [];

  if (health && health.agent_errors > 0) {
    healthAlerts.push(
      <Alert key="agents" variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>
          {health.agent_errors === 1
            ? "An agent is failing to sync"
            : `${health.agent_errors} agents are failing to sync`}
        </AlertTitle>
        <AlertDescription>
          Callers may reach an outdated version.{" "}
          <Link href={`${base}/agents`} className="font-medium underline underline-offset-4">
            Review agents
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (health && health.phone_number_errors > 0) {
    healthAlerts.push(
      <Alert key="numbers" variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>
          {health.phone_number_errors === 1
            ? "A phone number needs attention"
            : `${health.phone_number_errors} phone numbers need attention`}
        </AlertTitle>
        <AlertDescription>
          Provisioning failed — callers can&apos;t get through on it.{" "}
          <Link
            href={`${base}/phone-numbers`}
            className="font-medium underline underline-offset-4"
          >
            Fix phone numbers
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (health?.calendar_disconnected) {
    healthAlerts.push(
      <Alert key="calendar" variant="warning">
        <TriangleAlertIcon />
        <AlertTitle>Your calendar connection is failing</AlertTitle>
        <AlertDescription>
          New bookings aren&apos;t syncing to your external calendar.{" "}
          <Link
            href={`${base}/settings/calendar`}
            className="font-medium underline underline-offset-4"
          >
            Reconnect
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={`${todayLine(business.timezone)} · ${business.name}`}
        actions={<OpenStatusChip hours={data?.hours} timeZone={business.timezone} />}
      />

      {healthAlerts.length > 0 && <div className="flex flex-col gap-2">{healthAlerts}</div>}

      {query.isError ? (
        <div className="rounded-2xl border border-border">
          <ErrorState
            title="Couldn't load your overview"
            message={query.error.message}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : (
        <>
          <CallActivityTiles calls={data?.calls} />

          <div className={cn("grid grid-cols-1 items-stretch gap-4", "lg:grid-cols-3")}>
            <CallVolumeChart
              series={data?.series}
              calls={data?.calls}
              className="lg:col-span-2"
            />
            <NeedsAttentionCard />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnswerRateCard calls={data?.calls} />
            <BusiestHoursCard hourly={data?.hourly} />
            <TodayCard className="sm:col-span-2 lg:col-span-1" />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
            <RecentCallsCard className="lg:col-span-2" />
            <CapturedCard captured={data?.captured} />
          </div>
        </>
      )}

      <ModuleSnapshotCards />
    </div>
  );
}
