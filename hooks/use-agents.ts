"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  Agent,
  AgentTestCallTurn,
  CreateAgentPayload,
  UpdateAgentPayload,
  UpdateAgentResult,
} from "@/lib/api/types";
import { TRANSITIONAL_SYNC_STATUSES } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Keeps polling while any agent is still publishing to the voice engine. */
export function useAgents(businessUuid: string) {
  return useQuery<Agent[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "agents"),
    queryFn: () =>
      api.get<{ data: Agent[] }>(endpoints.agents.index).then((r) => r.data.data),
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data?.some((agent) =>
        TRANSITIONAL_SYNC_STATUSES.includes(agent.sync_status)
      )
        ? 4000
        : false,
  });
}

/**
 * Agents that can be picked in enablement/scoping UIs: consult bots are
 * platform-managed (the backend rejects them in agent_ids) and archived
 * agents shouldn't gain new knowledge.
 */
export function selectableAgents(agents: Agent[] | undefined): Agent[] {
  return (agents ?? []).filter(
    (agent) => agent.purpose !== "consult" && agent.status !== "archived"
  );
}

function detailKey(businessUuid: string, agentUuid: string) {
  return queryKeys.business(businessUuid, "agents", agentUuid);
}

/** Prefix-matches the list and every detail key. */
function invalidateAgents(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "agents") };
}

/** Polls while a save is publishing, so sync badges resolve on their own. */
export function useAgent(businessUuid: string, agentUuid: string) {
  return useQuery<Agent, ApiError>({
    queryKey: detailKey(businessUuid, agentUuid),
    queryFn: () =>
      api
        .get<{ data: Agent }>(endpoints.agents.show(agentUuid))
        .then((r) => r.data.data),
    refetchInterval: (query) =>
      query.state.data && TRANSITIONAL_SYNC_STATUSES.includes(query.state.data.sync_status)
        ? 4000
        : false,
  });
}

export function useCreateAgent(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Agent, ApiError, CreateAgentPayload>({
    mutationFn: (payload) =>
      api.post<{ data: Agent }>(endpoints.agents.index, payload).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateAgents(businessUuid)),
  });
}

export function useUpdateAgent(businessUuid: string, agentUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<UpdateAgentResult, ApiError, UpdateAgentPayload>({
    mutationFn: (payload) =>
      api
        .patch<{ data: Agent; warnings: UpdateAgentResult["warnings"] }>(
          endpoints.agents.show(agentUuid),
          payload
        )
        .then((r) => ({ agent: r.data.data, warnings: r.data.warnings ?? [] })),
    onSuccess: ({ agent }) => {
      // Seed the detail cache directly (starts the sync polling without a
      // refetch flash), then refresh only the list.
      queryClient.setQueryData(detailKey(businessUuid, agentUuid), agent);
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "agents"),
        exact: true,
      });
    },
  });
}

export function useDeleteAgent(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (agentUuid) =>
      api.delete(endpoints.agents.show(agentUuid)).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidateAgents(businessUuid)),
  });
}

function useLifecycleMutation(businessUuid: string, path: (uuid: string) => string) {
  const queryClient = useQueryClient();
  return useMutation<Agent, ApiError, string>({
    mutationFn: (agentUuid) =>
      api.post<{ data: Agent }>(path(agentUuid)).then((r) => r.data.data),
    onSuccess: (agent) => {
      queryClient.setQueryData(detailKey(businessUuid, agent.id), agent);
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "agents"),
        exact: true,
      });
    },
  });
}

export function useArchiveAgent(businessUuid: string) {
  return useLifecycleMutation(businessUuid, endpoints.agents.archive);
}

export function useRestoreAgent(businessUuid: string) {
  return useLifecycleMutation(businessUuid, endpoints.agents.restore);
}

export function useRotateAgentToolToken(agentUuid: string) {
  return useMutation<{ message: string }, ApiError, void>({
    mutationFn: () =>
      api
        .post<{ message: string }>(endpoints.agents.rotateToolToken(agentUuid))
        .then((r) => r.data),
  });
}

/**
 * One opening line from the simulated caller — the engine plays out a full
 * conversation with tools mocked. Slow upstream call; never retried.
 */
export function useAgentTestCall(agentUuid: string) {
  return useMutation<{ transcript: AgentTestCallTurn[] }, ApiError, { message: string }>({
    mutationFn: (payload) =>
      api
        .post<{ transcript: AgentTestCallTurn[] }>(endpoints.agents.testCall(agentUuid), payload)
        .then((r) => r.data),
    retry: false,
  });
}
