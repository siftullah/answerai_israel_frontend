"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { AppointmentListRow } from "@/components/appointments/list/appointment-list-row";
import { useBusiness } from "@/components/business/business-provider";
import { useAppointmentsInfinite } from "@/hooks/use-appointments";
import { dayKey, formatDayHeading } from "@/lib/datetime";
import type { Appointment, AppointmentListFilters } from "@/lib/api/types";

/**
 * The infinite rail, grouped under day headings (bookings are day-shaped in a
 * way callbacks aren't). Pages load as the sentinel scrolls into view.
 */
export function AppointmentList({
  businessUuid,
  filters,
  selectedId,
  nowMs,
  onSelect,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  businessUuid: string;
  filters: AppointmentListFilters;
  selectedId: string | null;
  nowMs: number;
  onSelect: (appointment: Appointment) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const t = useTranslations("appointments");
  const { business } = useBusiness();
  const query = useAppointmentsInfinite(businessUuid, filters);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t("list.loadError")}
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  const appointments = query.data.pages.flatMap((page) => page.data);

  if (appointments.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyAction}
      </Empty>
    );
  }

  // Rows arrive ordered by starts_at, so days form contiguous runs either way.
  const groups: { day: string; heading: string; items: Appointment[] }[] = [];
  for (const appointment of appointments) {
    const day = dayKey(appointment.starts_at, business.timezone);
    const last = groups[groups.length - 1];
    if (last?.day === day) {
      last.items.push(appointment);
    } else {
      groups.push({
        day,
        heading: formatDayHeading(appointment.starts_at, business.timezone),
        items: [appointment],
      });
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => (
        <div key={group.day} className="flex flex-col gap-2 pb-2">
          <p className="px-1 pt-2 text-xs font-medium text-muted-foreground">
            {group.heading}
          </p>
          {group.items.map((appointment) => (
            <AppointmentListRow
              key={appointment.id}
              appointment={appointment}
              selected={appointment.id === selectedId}
              timeZone={business.timezone}
              nowMs={nowMs}
              onSelect={() => onSelect(appointment)}
            />
          ))}
        </div>
      ))}
      {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Spinner className="size-4" />
        </div>
      )}
    </div>
  );
}
