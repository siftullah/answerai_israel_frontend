"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { Invitation, StoreInvitationPayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Pending invitations only (that's all the index returns). */
export function useInvitations(businessUuid: string) {
  return useQuery<Invitation[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "invitations"),
    queryFn: () =>
      api
        .get<{ data: Invitation[] }>(endpoints.invitations.index)
        .then((r) => r.data.data),
  });
}

export function useCreateInvitation(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invitation, ApiError, StoreInvitationPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Invitation }>(endpoints.invitations.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "invitations"),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "members") });
    },
  });
}

/** Same invitation, fresh token + expiry — the old email link stops working. */
export function useResendInvitation(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invitation, ApiError, string>({
    mutationFn: (id) =>
      api
        .post<{ data: Invitation }>(endpoints.invitations.resend(id))
        .then((r) => r.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "invitations"),
      }),
  });
}

export function useRevokeInvitation(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.invitations.show(id)).then(() => undefined),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "invitations"),
      }),
  });
}
