"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { CalendarSlot } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export interface CalendarSlotParams {
  /** UTC instants; ≤31 days apart. The backend floors `from` at now itself. */
  fromIso: string;
  toIso: string;
  /** User uuid; "" = the unassigned pool (fallback member included). */
  memberId: string;
}

/**
 * Bookable slots respecting the layered calendar settings (interval, notice,
 * buffers, daily cap) and the member's availability + connected calendar.
 */
export function useCalendarSlots(
  businessUuid: string,
  params: CalendarSlotParams | null
) {
  return useQuery<CalendarSlot[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "calendar", "slots", params),
    queryFn: () =>
      api
        .get<{ data: CalendarSlot[] }>(endpoints.calendar.slots, {
          params: {
            from: params!.fromIso,
            to: params!.toIso,
            ...(params!.memberId !== "" ? { member_id: params!.memberId } : {}),
          },
        })
        .then((r) => r.data.data),
    enabled: params !== null,
  });
}
