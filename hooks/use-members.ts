"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  BusinessMember,
  StoreMemberPayload,
  UpdateMemberPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useMembers(businessUuid: string) {
  return useQuery<BusinessMember[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "members"),
    queryFn: () =>
      api
        .get<{ data: BusinessMember[] }>(endpoints.members.index)
        .then((r) => r.data.data),
  });
}

function invalidateMembers(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "members") };
}

export function useCreateMember(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessMember, ApiError, StoreMemberPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: BusinessMember }>(endpoints.members.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateMembers(businessUuid)),
  });
}

export function useUpdateMember(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessMember, ApiError, { id: string; payload: UpdateMemberPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: BusinessMember }>(endpoints.members.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateMembers(businessUuid)),
  });
}

export function useDeleteMember(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    ApiError,
    { id: string; futureAppointments?: "keep" | "unassign" }
  >({
    mutationFn: ({ id, futureAppointments }) =>
      api
        .delete(endpoints.members.show(id), {
          params: futureAppointments ? { future_appointments: futureAppointments } : {},
        })
        .then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateMembers(businessUuid));
      // A pending invitation may have referenced the removed member.
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "invitations"),
      });
    },
  });
}
