"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  CalendarBusinessSettings,
  UpdateCalendarBusinessSettingsPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useBusinessCalendarSettings(businessUuid: string) {
  return useQuery<CalendarBusinessSettings, ApiError>({
    queryKey: queryKeys.business(businessUuid, "calendar-business-settings"),
    queryFn: () =>
      api
        .get<{ data: CalendarBusinessSettings }>(endpoints.calendar.businessSettings)
        .then((r) => r.data.data),
  });
}

export function useUpdateBusinessCalendarSettings(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<CalendarBusinessSettings, ApiError, UpdateCalendarBusinessSettingsPayload>({
    mutationFn: (payload) =>
      api
        .patch<{ data: CalendarBusinessSettings }>(endpoints.calendar.businessSettings, payload)
        .then((r) => r.data.data),
    // PATCH echoes the freshly resolved settings — seed the cache.
    onSuccess: (data) =>
      queryClient.setQueryData(
        queryKeys.business(businessUuid, "calendar-business-settings"),
        data
      ),
  });
}
