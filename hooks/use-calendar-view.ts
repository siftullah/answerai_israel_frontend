"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { ConnectedCalendarView, SystemCalendarItem } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export interface CalendarRange {
  /** UTC instants from zonedDayRangeToUtc — [fromIso, toIso). */
  fromIso: string;
  toIso: string;
}

/**
 * Our appointments + assigned callbacks in range (≤62 days). Admins see the
 * whole business (optionally one member); members see their own plus the
 * unassigned pool — the backend applies that, not us. Agents book during live
 * calls, so the grid stays on a refetch interval.
 */
export function useSystemCalendar(
  businessUuid: string,
  range: CalendarRange,
  memberId: string,
  enabled: boolean
) {
  return useQuery<SystemCalendarItem[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "calendar", "system", range, memberId),
    queryFn: () =>
      api
        .get<{ data: SystemCalendarItem[] }>(endpoints.calendar.systemView, {
          params: {
            from: range.fromIso,
            to: range.toIso,
            ...(memberId !== "" ? { member_id: memberId } : {}),
          },
        })
        .then((r) => r.data.data),
    enabled,
    // Keep the previous week/month on screen while the next range loads.
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/**
 * The caller's own external calendar, live (≤31 days — the view never asks for
 * a month grid). Server caches for 45s; provider failures come back as
 * `available: false` rather than an error.
 */
export function useConnectedCalendar(
  businessUuid: string,
  range: CalendarRange,
  enabled: boolean
) {
  return useQuery<ConnectedCalendarView, ApiError>({
    queryKey: queryKeys.business(businessUuid, "calendar", "connected", range),
    queryFn: () =>
      api
        .get<{ data: ConnectedCalendarView }>(endpoints.calendar.connectedView, {
          params: { from: range.fromIso, to: range.toIso },
        })
        .then((r) => r.data.data),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
