"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  CallSummarySettings,
  CallSummaryTestResult,
  UpdateCallSummarySettingsPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

function settingsKey(businessUuid: string, agentUuid: string) {
  return queryKeys.business(businessUuid, "agents", agentUuid, "call-summary-settings");
}

export function useAgentCallSummarySettings(businessUuid: string, agentUuid: string) {
  return useQuery<CallSummarySettings, ApiError>({
    queryKey: settingsKey(businessUuid, agentUuid),
    queryFn: () =>
      api
        .get<{ data: CallSummarySettings }>(endpoints.agents.callSummarySettings(agentUuid))
        .then((r) => r.data.data),
  });
}

export function useUpdateAgentCallSummarySettings(businessUuid: string, agentUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<CallSummarySettings, ApiError, UpdateCallSummarySettingsPayload>({
    mutationFn: (payload) =>
      api
        .put<{ data: CallSummarySettings }>(
          endpoints.agents.callSummarySettings(agentUuid),
          payload
        )
        .then((r) => r.data.data),
    // PUT echoes the saved settings — seed the cache.
    onSuccess: (data) => queryClient.setQueryData(settingsKey(businessUuid, agentUuid), data),
  });
}

/**
 * Composes a sample from the agent's latest completed call using the SAVED
 * settings and emails it to the signed-in user. Slow upstream (LLM) call;
 * never retried.
 */
export function useSendCallSummaryTest(agentUuid: string) {
  return useMutation<CallSummaryTestResult, ApiError, void>({
    mutationFn: () =>
      api
        .post<{ data: CallSummaryTestResult }>(endpoints.agents.callSummaryTest(agentUuid), {})
        .then((r) => r.data.data),
    retry: false,
  });
}
