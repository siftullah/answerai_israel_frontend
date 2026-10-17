"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  BusinessIntegration,
  ConnectIntegrationPayload,
  IntegrationProviderInfo,
  UpdateIntegrationPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Provider catalog merged with this business's connection state. */
export function useIntegrationProviders(businessUuid: string) {
  return useQuery<IntegrationProviderInfo[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "integration-providers"),
    queryFn: () =>
      api
        .get<{ data: IntegrationProviderInfo[] }>(endpoints.integrations.providers)
        .then((r) => r.data.data),
    // pending_setup is transient — the backend's first sync flips it to
    // connected/error within seconds, so poll until every connection settles.
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.connection?.status === "pending_setup") ? 4000 : false,
  });
}

function invalidateProviders(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "integration-providers") };
}

export function useConnectIntegration(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessIntegration, ApiError, ConnectIntegrationPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: BusinessIntegration }>(endpoints.integrations.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateProviders(businessUuid)),
  });
}

export function useUpdateIntegration(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessIntegration, ApiError, { id: string; payload: UpdateIntegrationPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: BusinessIntegration }>(endpoints.integrations.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateProviders(businessUuid)),
  });
}

export function useDisconnectIntegration(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (id) =>
      api
        .delete<{ message: string }>(endpoints.integrations.show(id))
        .then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateProviders(businessUuid)),
  });
}
