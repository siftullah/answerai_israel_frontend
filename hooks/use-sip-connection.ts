"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError, type ApiError } from "@/lib/api/errors";
import type { SipConnection, SipConnectResponse } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Singleton per business; a 404 means "never connected" — success with null. */
export function useSipConnection(businessUuid: string) {
  return useQuery<SipConnection | null, ApiError>({
    queryKey: queryKeys.business(businessUuid, "sip-connection"),
    queryFn: async () => {
      try {
        const r = await api.get<{ data: SipConnection }>(endpoints.sipConnection.show);
        return r.data.data;
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
  });
}

function invalidateConnection(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "sip-connection") };
}

/**
 * Connect (or reconnect) the trunk. Returns the full response — the caller
 * needs `credentials`, which exist only in this one response.
 */
export function useConnectSip(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<SipConnectResponse, ApiError, void>({
    mutationFn: () =>
      api.post<SipConnectResponse>(endpoints.sipConnection.show).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateConnection(businessUuid)),
  });
}

export function useRotateSipCredentials(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<SipConnectResponse, ApiError, void>({
    mutationFn: () =>
      api.post<SipConnectResponse>(endpoints.sipConnection.rotate).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateConnection(businessUuid)),
  });
}

export function useDisconnectSip(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<SipConnection, ApiError, void>({
    mutationFn: () =>
      api
        .delete<{ data: SipConnection }>(endpoints.sipConnection.show)
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateConnection(businessUuid));
      // Defensive: keeps the disconnect gate's live-number count honest.
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "phone-numbers"),
      });
    },
  });
}
