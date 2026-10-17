"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import { CreateCallbackDialog } from "@/components/callbacks/create-callback-dialog";
import {
  CALENDAR_VIEW_LABELS,
  CALENDAR_VIEW_MODES,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  systemItemToGridEvent,
  type CalendarSource,
  type CalendarViewMode,
  type GridEvent,
} from "@/components/calendar/calendar-lib";
import { ConnectedCalendar } from "@/components/calendar/connected-calendar";
import { CreateAppointmentDialog } from "@/components/calendar/create-appointment-dialog";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { MonthGrid } from "@/components/calendar/month-grid";
import { TimeGrid } from "@/components/calendar/time-grid";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { useCalendarConnections } from "@/hooks/use-calendar-connections";
import { useSystemCalendar } from "@/hooks/use-calendar-view";
import { useMembers } from "@/hooks/use-members";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  dayKey,
  parseDateKey,
  startOfMonthDateKey,
  startOfWeekDateKey,
  zonedDayRangeToUtc,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}

/**
 * The calendar page: system view (our appointments + assigned callbacks) and
 * the member's connected Outlook view, toggled but never merged. View, date,
 * source, and member filter live in the URL so ranges are shareable.
 */
export function CalendarView() {
  const { business, membership } = useBusiness();
  const timeZone = business.timezone;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";
  const appointmentsEnabled = useModuleEnabled("appointments");
  const callbacksEnabled = useModuleEnabled("callbacks");

  // A minute-resolution "now" so today/overdue states stay honest over time
  // without impure clock reads during render.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = dayKey(new Date(nowMs).toISOString(), timeZone);

  // --- URL state -----------------------------------------------------------
  const source: CalendarSource =
    searchParams.get("source") === "connected" ? "connected" : "system";
  const viewParam = searchParams.get("view") as CalendarViewMode | null;
  const requestedView =
    viewParam !== null && CALENDAR_VIEW_MODES.includes(viewParam) ? viewParam : "week";
  // The connected view is capped at 31 days server-side — no month grid there.
  const view = source === "connected" && requestedView === "month" ? "week" : requestedView;
  const dateParam = searchParams.get("date") ?? "";
  const anchorKey = parseDateKey(dateParam) ? dateParam : todayKey;
  const memberId = privileged ? (searchParams.get("member") ?? "") : "";

  const setParams = (
    patch: Partial<{ source: string; view: string; date: string; member: string }>
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    const defaults: Record<string, string> = {
      source: "system",
      view: "week",
      date: todayKey,
      member: "",
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === defaults[key]) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // --- Visible range -------------------------------------------------------
  const { dayKeys, monthKey, title, range } = useMemo(() => {
    if (view === "day") {
      return {
        dayKeys: [anchorKey],
        monthKey: startOfMonthDateKey(anchorKey),
        title: formatDayTitle(anchorKey),
        range: zonedDayRangeToUtc(anchorKey, addDaysToDateKey(anchorKey, 1), timeZone),
      };
    }
    if (view === "week") {
      const start = startOfWeekDateKey(anchorKey);
      const keys = Array.from({ length: 7 }, (_, i) => addDaysToDateKey(start, i));
      return {
        dayKeys: keys,
        monthKey: startOfMonthDateKey(anchorKey),
        title: formatWeekTitle(keys[0], keys[6]),
        range: zonedDayRangeToUtc(start, addDaysToDateKey(start, 7), timeZone),
      };
    }
    const month = startOfMonthDateKey(anchorKey);
    const gridStart = startOfWeekDateKey(month);
    const keys = Array.from({ length: 42 }, (_, i) => addDaysToDateKey(gridStart, i));
    return {
      dayKeys: keys,
      monthKey: month,
      title: formatMonthTitle(month),
      range: zonedDayRangeToUtc(gridStart, addDaysToDateKey(gridStart, 42), timeZone),
    };
  }, [view, anchorKey, timeZone]);

  const navigate = (direction: -1 | 1) => {
    const next =
      view === "day"
        ? addDaysToDateKey(anchorKey, direction)
        : view === "week"
          ? addDaysToDateKey(startOfWeekDateKey(anchorKey), direction * 7)
          : addMonthsToDateKey(anchorKey, direction);
    setParams({ date: next });
  };

  // --- Data ----------------------------------------------------------------
  const systemQuery = useSystemCalendar(business.id, range, memberId, source === "system");
  const hoursQuery = useBusinessHours(business.id);
  const membersQuery = useMembers(business.id);
  const connectionsQuery = useCalendarConnections(business.id);

  const events = useMemo(
    () => (systemQuery.data ?? []).map((item) => systemItemToGridEvent(item, nowMs)),
    [systemQuery.data, nowMs]
  );

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const memberItems = [
    { value: "", label: "Everyone" },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const activeConnection = (connectionsQuery.data ?? []).find(
    (connection) => connection.is_active
  );

  // --- Interactions --------------------------------------------------------
  const [selected, setSelected] = useState<GridEvent | null>(null);
  const [creatingAppointment, setCreatingAppointment] = useState<{
    date?: string;
    time?: string;
  } | null>(null);
  const [creatingCallback, setCreatingCallback] = useState(false);

  const handleSlotClick =
    appointmentsEnabled && source === "system"
      ? (date: string, time: string) => setCreatingAppointment({ date, time })
      : undefined;

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title="Calendar"
        description="Bookings across your team — with your own Outlook alongside."
        actions={
          <>
            <Button
              variant="outline"
              render={<Link href={`/b/${business.id}/business-profile/calendar`} />}
            >
              <SlidersHorizontalIcon />
              Booking rules
            </Button>
            <Button
              variant="outline"
              render={<Link href={`/b/${business.id}/settings/calendar`} />}
            >
              <CalendarClockIcon />
              Calendar sync
            </Button>
            {callbacksEnabled && (
              <Button variant="outline" onClick={() => setCreatingCallback(true)}>
                <PhoneIcon />
                New callback
              </Button>
            )}
            {appointmentsEnabled && (
              <Button onClick={() => setCreatingAppointment({})}>
                <PlusIcon />
                New appointment
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={source} onValueChange={(value) => setParams({ source: value as string })}>
          <TabsList>
            <TabsTrigger value="system">System calendar</TabsTrigger>
            <TabsTrigger value="connected">
              Outlook
              {activeConnection && (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    activeConnection.status === "active" ? "bg-success" : "bg-warning"
                  )}
                />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {source === "system" && privileged && (
            <Select
              items={memberItems}
              value={memberId}
              onValueChange={(value) => setParams({ member: (value as string | null) ?? "" })}
            >
              <SelectTrigger className="w-44" aria-label="Filter by team member">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {memberItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs value={view} onValueChange={(value) => setParams({ view: value as string })}>
            <TabsList>
              {CALENDAR_VIEW_MODES.map((mode) => (
                <TabsTrigger
                  key={mode}
                  value={mode}
                  disabled={mode === "month" && source === "connected"}
                >
                  {CALENDAR_VIEW_LABELS[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label={`Previous ${view}`}
          >
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" onClick={() => setParams({ date: todayKey })}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            aria-label={`Next ${view}`}
          >
            <ChevronRightIcon />
          </Button>
          <h2 className="ml-1 font-heading text-lg font-medium">{title}</h2>
        </div>

        {source === "system" && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <LegendDot className="bg-event-appointment" label="Appointment" />
            <LegendDot className="bg-event-callback" label="Callback" />
            <LegendDot className="bg-event-job" label="Job" />
            <LegendDot className="bg-warning" label="Needs attention" />
            <LegendDot className="bg-muted-foreground/50" label="Done" />
          </div>
        )}
      </div>

      {source === "system" ? (
        systemQuery.isPending ? (
          <Skeleton className="h-96 w-full rounded-lg lg:flex-1" />
        ) : systemQuery.isError ? (
          <ErrorState
            message={systemQuery.error.message}
            onRetry={() => void systemQuery.refetch()}
          />
        ) : view === "month" ? (
          <MonthGrid
            dayKeys={dayKeys}
            monthKey={monthKey}
            timeZone={timeZone}
            todayKey={todayKey}
            events={events}
            onSelectEvent={setSelected}
            onSelectDay={(key) => setParams({ view: "day", date: key })}
          />
        ) : (
          <TimeGrid
            dayKeys={dayKeys}
            timeZone={timeZone}
            todayKey={todayKey}
            events={events}
            businessHours={hoursQuery.data ?? []}
            onSelectEvent={setSelected}
            onSelectSlot={handleSlotClick}
          />
        )
      ) : (
        <ConnectedCalendar
          dayKeys={dayKeys}
          todayKey={todayKey}
          range={range}
          businessHours={hoursQuery.data ?? []}
          onSelectEvent={setSelected}
        />
      )}

      <EventDetailDialog event={selected} onClose={() => setSelected(null)} />

      {creatingAppointment !== null && (
        <CreateAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreatingAppointment(null);
          }}
          defaults={creatingAppointment}
        />
      )}

      {creatingCallback && (
        <CreateCallbackDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreatingCallback(false);
          }}
          onCreated={() => setCreatingCallback(false)}
        />
      )}
    </div>
  );
}
