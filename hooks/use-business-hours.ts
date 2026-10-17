"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { BusinessHourRow, BusinessHourRowApiPayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** The business's trading-hours week (all-scope-null rows only). */
export function useBusinessHours(businessUuid: string) {
  return useQuery<BusinessHourRow[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "business-hours"),
    queryFn: () =>
      api
        .get<{ data: BusinessHourRow[] }>(endpoints.businessHours)
        .then((r) => r.data.data),
  });
}

export function useReplaceBusinessHours(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessHourRow[], ApiError, { days: BusinessHourRowApiPayload[] }>({
    mutationFn: (payload) =>
      api
        .put<{ data: BusinessHourRow[] }>(endpoints.businessHours, payload)
        .then((r) => r.data.data),
    // PUT returns the re-read week — seed the cache directly.
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.business(businessUuid, "business-hours"), data),
  });
}
