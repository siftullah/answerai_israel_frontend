"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { BusinessPolicy, BusinessPolicyPayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useBusinessPolicies(businessUuid: string) {
  return useQuery<BusinessPolicy[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "business-policies"),
    queryFn: () =>
      api
        .get<{ data: BusinessPolicy[] }>(endpoints.businessPolicies.index)
        .then((r) => r.data.data),
  });
}

function invalidatePolicies(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "business-policies") };
}

export function useCreateBusinessPolicy(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessPolicy, ApiError, BusinessPolicyPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: BusinessPolicy }>(endpoints.businessPolicies.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidatePolicies(businessUuid)),
  });
}

export function useUpdateBusinessPolicy(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessPolicy, ApiError, { id: string; payload: BusinessPolicyPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: BusinessPolicy }>(endpoints.businessPolicies.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidatePolicies(businessUuid)),
  });
}

export function useDeleteBusinessPolicy(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.businessPolicies.show(id)).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidatePolicies(businessUuid)),
  });
}
