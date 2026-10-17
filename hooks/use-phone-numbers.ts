"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  AvailablePhoneNumber,
  PhoneNumber,
  PurchasePhoneNumberPayload,
  RegisterSipNumberPayload,
  UpdatePhoneNumberPayload,
} from "@/lib/api/types";
import { TRANSITIONAL_PHONE_STATUSES } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Keeps polling while any number is still provisioning or releasing. */
export function usePhoneNumbers(businessUuid: string) {
  return useQuery<PhoneNumber[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "phone-numbers"),
    queryFn: () =>
      api
        .get<{ data: PhoneNumber[] }>(endpoints.phoneNumbers.index)
        .then((r) => r.data.data),
    refetchInterval: (query) =>
      query.state.data?.some((number) =>
        TRANSITIONAL_PHONE_STATUSES.includes(number.status)
      )
        ? 4000
        : false,
  });
}

/**
 * Live Twilio inventory search (AU local only) — runs once `contains` is
 * non-null (the dialog fires an unfiltered "" search on open). No retries:
 * the upstream call is slow and can 503 when provisioning is unavailable.
 */
export function useAvailablePhoneNumbers(businessUuid: string, contains: string | null) {
  return useQuery<AvailablePhoneNumber[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "phone-numbers", "available", contains ?? ""),
    queryFn: () =>
      api
        .get<{ data: AvailablePhoneNumber[] }>(endpoints.phoneNumbers.available, {
          params: { country: "AU", type: "local", ...(contains ? { contains } : {}) },
        })
        .then((r) => r.data.data),
    enabled: contains !== null,
    retry: false,
    staleTime: 30_000,
  });
}

// Prefix-matches the availability keys too — a purchase makes cached
// search results stale, which is exactly what we want.
function invalidateNumbers(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "phone-numbers") };
}

export function usePurchasePhoneNumber(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<PhoneNumber, ApiError, PurchasePhoneNumberPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: PhoneNumber }>(endpoints.phoneNumbers.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateNumbers(businessUuid)),
  });
}

export function useRegisterSipNumber(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<PhoneNumber, ApiError, RegisterSipNumberPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: PhoneNumber }>(endpoints.phoneNumbers.sip, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateNumbers(businessUuid)),
  });
}

export function useUpdatePhoneNumber(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<PhoneNumber, ApiError, { id: string; payload: UpdatePhoneNumberPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: PhoneNumber }>(endpoints.phoneNumbers.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateNumbers(businessUuid)),
  });
}

export function useReleasePhoneNumber(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<PhoneNumber, ApiError, string>({
    mutationFn: (id) =>
      api
        .delete<{ data: PhoneNumber }>(endpoints.phoneNumbers.show(id))
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateNumbers(businessUuid)),
  });
}

export function useRetryPhoneNumber(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<PhoneNumber, ApiError, string>({
    mutationFn: (id) =>
      api
        .post<{ data: PhoneNumber }>(endpoints.phoneNumbers.retry(id))
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateNumbers(businessUuid)),
  });
}
