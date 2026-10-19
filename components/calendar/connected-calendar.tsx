"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("calendar.connected");
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
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href={`/b/${business.id}/settings/calendar`} />}>
          {t("empty.connect")}
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
          <EmptyTitle>{t("broken.title")}</EmptyTitle>
          <EmptyDescription>
            {active.account_email
              ? t("broken.description", { email: active.account_email })
              : t("broken.descriptionNoEmail")}
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href={`/b/${business.id}/settings/calendar`} />}>
          {t("broken.goToSettings")}
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
          {viewQuery.data.account_email
            ? t("showing", { email: viewQuery.data.account_email })
            : t("showingNoEmail")}
        </p>
      ) : (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>{t("unavailable")}</AlertDescription>
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
