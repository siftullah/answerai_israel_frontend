"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { TransferMode, TransferTarget, TransferTargetPayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/**
 * The transfer directory: business-wide by default, or one agent's OWN
 * entries when `agentUuid` is given (an agent with any own entries never
 * falls back to the business-wide set).
 */
export function useTransferTargets(businessUuid: string, agentUuid?: string) {
  return useQuery<TransferTarget[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "transfer-targets", agentUuid ?? "business"),
    queryFn: () =>
      api
        .get<{ data: TransferTarget[] }>(endpoints.transferTargets.index, {
          params: agentUuid ? { agent_id: agentUuid } : undefined,
        })
        .then((r) => r.data.data),
  });
}

// Bare prefix — matches the business-wide AND every agent-scoped query.
// Cross-scope invalidation is deliberate: an agent's own entries decide
// whether it falls back to the business directory.
function invalidateTargets(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "transfer-targets") };
}

export function useCreateTransferTarget(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<TransferTarget, ApiError, TransferTargetPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: TransferTarget }>(endpoints.transferTargets.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateTargets(businessUuid)),
  });
}

export function useUpdateTransferTarget(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<TransferTarget, ApiError, { id: string; payload: TransferTargetPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: TransferTarget }>(endpoints.transferTargets.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateTargets(businessUuid)),
  });
}

export function useDeleteTransferTarget(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      api.delete(endpoints.transferTargets.show(id)).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidateTargets(businessUuid)),
  });
}

/** Flips every target in one scope (business-wide, or one agent's own) to one mode. */
export function useSetTransferMode(businessUuid: string, agentUuid?: string) {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ApiError, TransferMode>({
    mutationFn: (mode) =>
      api
        .post<{ message: string }>(endpoints.transferTargets.setMode, {
          mode,
          ...(agentUuid ? { agent_id: agentUuid } : {}),
        })
        .then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateTargets(businessUuid)),
  });
}
