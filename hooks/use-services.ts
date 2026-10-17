"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { Service, ServiceListFilters, ServicePayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useServices(businessUuid: string, filters: ServiceListFilters = {}) {
  return useQuery<Service[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "services", filters),
    queryFn: () =>
      api
        .get<{ data: Service[] }>(endpoints.services.index, { params: filters })
        .then((r) => r.data.data),
    placeholderData: (previous) => previous,
  });
}

function invalidateServices(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "services") };
}

export function useCreateService(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Service, ApiError, ServicePayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Service }>(endpoints.services.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateServices(businessUuid)),
  });
}

export function useUpdateService(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Service, ApiError, { id: string; payload: ServicePayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: Service }>(endpoints.services.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateServices(businessUuid)),
  });
}

export function useDeleteService(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.services.show(id)).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidateServices(businessUuid)),
  });
}
