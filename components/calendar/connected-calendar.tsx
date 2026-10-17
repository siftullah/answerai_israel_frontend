"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarOffIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useBusiness } from "@/components/business/business-provider";
import { externalEventToGridEvent, type GridEvent } from "@/components/calendar/calendar-lib";
import { TimeGrid } from "@/components/calendar/time-grid";
import { useCalendarConnections } from "@/hooks/use-calendar-connections";
import { useConnectedCalendar, type CalendarRange } from "@/hooks/use-calendar-view";
import type { BusinessHourRow } from "@/lib/api/types";

/**
 * View-only live replica of the signed-in member's own Outlook calendar —
 * deliberately never merged with the system view. Our pushed copies are
 * flagged so the member can tell them apart.
 */
export function ConnectedCalendar({
  dayKeys,
  todayKey,
  range,
  businessHours,
  onSelectEvent,
}: {
  dayKeys: string[];
  todayKey: string;
  range: CalendarRange;
  businessHours: BusinessHourRow[];
  onSelectEvent: (event: GridEvent) => void;
}) {
  const { business } = useBusiness();
  const connectionsQuery = useCalendarConnections(business.id);

  const active = (connectionsQuery.data ?? []).find((connection) => connection.is_active);
  const healthy = active !== undefined && active.status === "active";

  const viewQuery = useConnectedCalendar(business.id, range, healthy);

  const { events, allDayEvents } = useMemo(() => {
    const mapped = (viewQuery.data?.events ?? []).map(externalEventToGridEvent);
    return {
      events: mapped.filter((event) => !event.allDay),
      allDayEvents: mapped.filter((event) => event.allDay),
    };
  }, [viewQuery.data]);

  if (connectionsQuery.isPending) {
    return <Skeleton className="h-96 w-full rounded-lg lg:flex-1" />;
  }

  if (connectionsQuery.isError) {
    return (
      <ErrorState
        message={connectionsQuery.error.message}
        onRetry={() => void connectionsQuery.refetch()}
      />
    );
  }

  if (!active) {
    return (
      <Empty className="border border-dashed lg:flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOffIcon />
          </EmptyMedia>
          <EmptyTitle>No calendar connected</EmptyTitle>
          <EmptyDescription>
            Connect your Outlook calendar to see it side by side with the system calendar.
            Each team member connects their own.
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href={`/b/${business.id}/settings/calendar`} />}>
          Connect Outlook
        </Button>
      </Empty>
    );
  }

  if (!healthy) {
    return (
      <Empty className="border border-dashed lg:flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon className="text-warning" />
          </EmptyMedia>
          <EmptyTitle>Calendar needs reconnecting</EmptyTitle>
          <EmptyDescription>
            The connection to {active.account_email ?? "your Outlook account"} stopped
            working. Reconnect it to bring this view back.
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href={`/b/${business.id}/settings/calendar`} />}>
          Go to calendar settings
        </Button>
      </Empty>
    );
  }

  if (viewQuery.isPending) {
    return <Skeleton className="h-96 w-full rounded-lg lg:flex-1" />;
  }

  if (viewQuery.isError) {
    return (
      <ErrorState message={viewQuery.error.message} onRetry={() => void viewQuery.refetch()} />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 lg:flex-1">
      {viewQuery.data.available ? (
        <p className="text-sm text-muted-foreground">
          Showing {viewQuery.data.account_email ?? "your Outlook calendar"} — view-only.
        </p>
      ) : (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>
            Outlook didn&apos;t respond just now, so events are hidden. This usually clears
            up on its own — try again in a minute.
          </AlertDescription>
        </Alert>
      )}
      <TimeGrid
        dayKeys={dayKeys}
        timeZone={business.timezone}
        todayKey={todayKey}
        events={events}
        allDayEvents={allDayEvents}
        businessHours={businessHours}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
}
