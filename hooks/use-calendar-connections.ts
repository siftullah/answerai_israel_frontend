"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { CalendarConnection } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useCalendarConnections(businessUuid: string) {
  return useQuery<CalendarConnection[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "calendar-connections"),
    queryFn: () =>
      api
        .get<{ data: CalendarConnection[] }>(endpoints.calendar.connections)
        .then((r) => r.data.data),
  });
}

/**
 * Fetches the provider consent URL, then hands off with a full-page redirect —
 * the backend brings the browser back to `returnTo` with ?connection=success|error.
 * (A 302 from the API would die on cross-origin fetch rules, so it returns JSON.)
 */
export function useConnectCalendar() {
  return useMutation<string, ApiError, { returnTo: string }>({
    mutationFn: ({ returnTo }) =>
      api
        .get<{ authorize_url: string }>(endpoints.calendar.authorize("microsoft"), {
          params: { return_to: returnTo },
        })
        .then((r) => r.data.authorize_url),
    onSuccess: (authorizeUrl) => {
      window.location.href = authorizeUrl;
    },
  });
}

export function useDisconnectCalendar(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.calendar.connection(id)).then(() => undefined),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "calendar-connections"),
      }),
  });
}
