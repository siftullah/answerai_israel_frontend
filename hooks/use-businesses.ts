"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { Business, UpdateBusinessPayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation<Business, ApiError, { name: string }>({
    // businesses endpoints are {data}-wrapped, unlike the flat auth/me responses.
    mutationFn: (payload) =>
      api.post<{ data: Business }>(endpoints.businesses.index, payload).then((r) => r.data.data),
    // New membership appears in /me — refetch it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useUpdateBusiness(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Business, ApiError, UpdateBusinessPayload>({
    mutationFn: (payload) =>
      api
        .patch<{ data: Business }>(endpoints.businesses.show(businessUuid), payload)
        .then((r) => r.data.data),
    // BusinessProvider reads the business off /me memberships — that's the cache to refresh.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
