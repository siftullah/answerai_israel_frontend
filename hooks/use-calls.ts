"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  Call,
  CallExtraction,
  CallListFilters,
  CallRelated,
  CallTranscript,
  CursorPaginated,
  PlaceCallPayload,
} from "@/lib/api/types";
import { TRANSITIONAL_CALL_STATUSES } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** Artifact fetches: a 404 means "not produced (yet)" — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

function isTransitional(call: Call) {
  return TRANSITIONAL_CALL_STATUSES.includes(call.status);
}

/**
 * Infinite call log. Polls only while an outbound page holds a live call —
 * inbound rows are created post-call and always land terminal.
 */
export function useCallsInfinite(businessUuid: string, filters: CallListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Call>,
    ApiError,
    InfiniteData<CursorPaginated<Call>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "calls", "list", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Call>>(endpoints.calls.index, {
          params: {
            ...filters,
            has_recording: filters.has_recording ? 1 : undefined,
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
    refetchInterval: (query) =>
      filters.direction === "outbound" &&
      query.state.data?.pages.some((page) => page.data.some(isTransitional))
        ? 4000
        : false,
  });
}

/** Single call — polls while an outbound call is still in flight. */
export function useCall(businessUuid: string, callUuid: string | null) {
  return useQuery<Call, ApiError>({
    queryKey: queryKeys.business(businessUuid, "calls", "detail", callUuid ?? ""),
    queryFn: () =>
      api.get<{ data: Call }>(endpoints.calls.show(callUuid ?? "")).then((r) => r.data.data),
    enabled: callUuid !== null,
    retry: retrySkipping404,
    refetchInterval: (query) =>
      query.state.data && isTransitional(query.state.data) ? 4000 : false,
  });
}

export function useCallTranscript(businessUuid: string, callUuid: string, enabled: boolean) {
  return useQuery<CallTranscript, ApiError>({
    queryKey: queryKeys.business(businessUuid, "calls", "detail", callUuid, "transcript"),
    queryFn: () =>
      api
        .get<{ data: CallTranscript }>(endpoints.calls.transcript(callUuid))
        .then((r) => r.data.data),
    enabled,
    retry: retrySkipping404,
  });
}

export function useCallExtraction(businessUuid: string, callUuid: string, enabled: boolean) {
  return useQuery<CallExtraction, ApiError>({
    queryKey: queryKeys.business(businessUuid, "calls", "detail", callUuid, "extraction"),
    // Unwrapped once, not twice: the resource's own top-level `data` key makes
    // Laravel skip its usual envelope.
    queryFn: () =>
      api.get<CallExtraction>(endpoints.calls.extraction(callUuid)).then((r) => r.data),
    enabled,
    retry: retrySkipping404,
  });
}

export function useCallRelated(businessUuid: string, callUuid: string, enabled: boolean) {
  return useQuery<CallRelated, ApiError>({
    queryKey: queryKeys.business(businessUuid, "calls", "detail", callUuid, "related"),
    queryFn: () =>
      api.get<{ data: CallRelated }>(endpoints.calls.related(callUuid)).then((r) => r.data.data),
    enabled,
    retry: retrySkipping404,
  });
}

/**
 * Recording URLs are fetched on demand (signed, so never cached as fresh).
 * `type: "conference"` is the bridged caller↔responder leg of a warm transfer.
 */
export function useCallRecording(
  businessUuid: string,
  callUuid: string,
  options: { type?: "conference"; enabled: boolean }
) {
  return useQuery<{ url: string }, ApiError>({
    queryKey: queryKeys.business(
      businessUuid,
      "calls",
      "detail",
      callUuid,
      "recording",
      options.type ?? "main"
    ),
    queryFn: () =>
      api
        .get<{ url: string }>(endpoints.calls.recording(callUuid), {
          params: options.type ? { type: options.type } : undefined,
        })
        .then((r) => r.data),
    enabled: options.enabled,
    retry: false,
    staleTime: 0,
  });
}

export function useUpdateCallNotes(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Call, ApiError, { id: string; notes: string | null }>({
    mutationFn: ({ id, notes }) =>
      api.patch<{ data: Call }>(endpoints.calls.show(id), { notes }).then((r) => r.data.data),
    // The PATCH response reloads fewer relations than show (no campaign/callback,
    // downgraded transfer block) — merge only the notes into the cached detail.
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<Call>(
        queryKeys.business(businessUuid, "calls", "detail", id),
        (old) => (old ? { ...old, notes: updated.notes } : old)
      );
    },
  });
}

export function usePlaceCall(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Call, ApiError, { payload: PlaceCallPayload; idempotencyKey: string }>({
    mutationFn: ({ payload, idempotencyKey }) =>
      api
        .post<{ data: Call }>(endpoints.calls.index, payload, {
          headers: { "Idempotency-Key": idempotencyKey },
        })
        .then((r) => r.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") }),
  });
}

export function useCancelCall(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Call, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Call }>(endpoints.calls.cancel(id)).then((r) => r.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") }),
  });
}
