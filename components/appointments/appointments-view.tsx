"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { AppointmentDetailPane } from "@/components/appointments/detail/appointment-detail-pane";
import { AppointmentList } from "@/components/appointments/list/appointment-list";
import {
  AppointmentListFilters,
  EMPTY_APPOINTMENT_FILTERS,
  type AppointmentFilterState,
} from "@/components/appointments/list/appointment-list-filters";
import { CreateAppointmentDialog } from "@/components/calendar/create-appointment-dialog";
import { useAppointmentCounts } from "@/hooks/use-appointments";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMembers } from "@/hooks/use-members";
import { businessDayUtcRange } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentListFilters as ApiFilters } from "@/lib/api/types";
import { UPCOMING_APPOINTMENT_STATUSES } from "@/lib/api/types";

export type AppointmentTab = "upcoming" | "today" | "needs_review" | "history";

const OPEN_STATUSES = UPCOMING_APPOINTMENT_STATUSES.join(",");
const TERMINAL_STATUSES = "completed,canceled,no_show";

/**
 * Master-detail shell mirroring the callbacks page: list rail + detail pane on
 * one divider. Only the selected appointment lives in the URL (?appointment=…);
 * the tab and filters are page-local, so a deep link lands on the default tab
 * but the pane still renders any uuid.
 */
export function AppointmentsView() {
  const t = useTranslations("appointments");
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("appointment");

  const membersQuery = useMembers(business.id);
  const countsQuery = useAppointmentCounts(business.id);

  const [tab, setTab] = useState<AppointmentTab>("upcoming");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AppointmentFilterState>(EMPTY_APPOINTMENT_FILTERS);
  const [creating, setCreating] = useState(false);

  const q = useDebouncedValue(search, 400).trim();

  // A minute-resolution "now" so needs-review flags stay honest over time
  // without impure clock reads during render.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Recomputed whenever the tab activates, so a page left open across
  // midnight self-corrects on the next switch.
  const todayRange = useMemo(
    () => (tab === "upcoming" || tab === "today" ? businessDayUtcRange(business.timezone) : null),
    [tab, business.timezone]
  );

  const apiFilters: ApiFilters = useMemo(() => {
    // A status refine narrows the tab's set to that single status.
    const status =
      filters.status !== ""
        ? filters.status
        : tab === "history"
          ? TERMINAL_STATUSES
          : OPEN_STATUSES;
    return {
      ...(tab === "needs_review" ? { needs_review: true } : { status }),
      ...(tab === "history" ? { sort: "newest" as const } : {}),
      ...(tab === "upcoming" && todayRange ? { from: todayRange.startIso } : {}),
      ...(tab === "today" && todayRange
        ? { from: todayRange.startIso, to: todayRange.endIso }
        : {}),
      ...(q !== "" ? { q } : {}),
      ...(filters.source !== "" ? { source: filters.source } : {}),
      ...(filters.memberId !== "" ? { member_id: filters.memberId } : {}),
    };
  }, [tab, todayRange, q, filters]);

  const hasActiveFilters =
    q !== "" || filters.source !== "" || filters.status !== "" || filters.memberId !== "";

  const select = (appointment: Appointment) =>
    router.replace(`${pathname}?appointment=${appointment.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const changeTab = (next: AppointmentTab) => {
    setTab(next);
    // The status refine is tab-scoped; keep the rest.
    setFilters((current) => ({ ...current, status: "" }));
  };

  const counts = countsQuery.data;
  const newAppointmentButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      {t("page.newAppointment")}
    </Button>
  );

  const emptyCopy: Record<AppointmentTab | "noMatch", { title: string; description: string }> = {
    upcoming: { title: t("empty.upcoming.title"), description: t("empty.upcoming.description") },
    today: { title: t("empty.today.title"), description: t("empty.today.description") },
    needs_review: {
      title: t("empty.needsReview.title"),
      description: t("empty.needsReview.description"),
    },
    history: { title: t("empty.history.title"), description: t("empty.history.description") },
    noMatch: { title: t("empty.noMatch.title"), description: t("empty.noMatch.description") },
  };
  const copy = emptyCopy[hasActiveFilters ? "noMatch" : tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={
          <>
            <Button variant="outline" render={<Link href={`/b/${business.id}/calendar`} />}>
              <CalendarIcon />
              {t("page.openCalendar")}
            </Button>
            {newAppointmentButton}
          </>
        }
      />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-e lg:pe-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as AppointmentTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="upcoming">
                {t("tabs.upcoming")}
                {counts !== undefined && counts.upcoming > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.upcoming}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="today">
                {t("tabs.today")}
                {counts !== undefined && counts.today > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.today}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="needs_review">
                {t("tabs.needsReview")}
                {counts !== undefined && counts.needs_review > 0 && (
                  <Badge variant="warning" className="h-5">
                    {counts.needs_review}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <AppointmentListFilters
            tab={tab}
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            members={membersQuery.data}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pe-1.5 lg:-me-3">
            <AppointmentList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              nowMs={nowMs}
              onSelect={select}
              emptyTitle={copy.title}
              emptyDescription={copy.description}
              emptyAction={hasActiveFilters ? undefined : newAppointmentButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching appointments starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:ps-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <AppointmentDetailPane
            businessUuid={business.id}
            appointmentUuid={selectedId}
            nowMs={nowMs}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {creating && (
        <CreateAppointmentDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onCreated={(appointment) => {
            changeTab("upcoming");
            select(appointment);
          }}
        />
      )}
    </div>
  );
}
