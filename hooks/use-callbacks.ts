"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  Callback,
  CallbackCounts,
  CallbackListFilters,
  CompleteCallbackPayload,
  CursorPaginated,
  StoreCallbackPayload,
  UpdateCallbackPayload,
} from "@/lib/api/types";
import { ACTIVE_CALLBACK_STATUSES } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** Detail fetches: a 404 means deleted or foreign — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/** The dispatcher is mid-flight on this row — keep the view fresh. */
function isActive(callback: Callback) {
  return ACTIVE_CALLBACK_STATUSES.includes(callback.status);
}

/**
 * Every callback mutation invalidates the calls prefix too: call rows embed a
 * `callback` chip and the call detail's related section lists callbacks. The
 * calendar prefix keeps the system calendar view in step.
 */
function invalidateCallbackData(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "callbacks") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calendar") });
}

export function useCallbacksInfinite(businessUuid: string, filters: CallbackListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Callback>,
    ApiError,
    InfiniteData<CursorPaginated<Callback>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "callbacks", "list", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Callback>>(endpoints.callbacks.index, {
          params: {
            ...filters,
            overdue: filters.overdue ? 1 : undefined,
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) => page.data.some(isActive)) ? 4000 : false,
  });
}

/** Tab badges. Cheap COUNTs; the interval keeps "due today" honest over time. */
export function useCallbackCounts(businessUuid: string, options?: { enabled?: boolean }) {
  return useQuery<CallbackCounts, ApiError>({
    queryKey: queryKeys.business(businessUuid, "callbacks", "counts"),
    queryFn: () =>
      api.get<{ data: CallbackCounts }>(endpoints.callbacks.counts).then((r) => r.data.data),
    refetchInterval: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCallbackDetail(businessUuid: string, callbackUuid: string | null) {
  return useQuery<Callback, ApiError>({
    queryKey: queryKeys.business(businessUuid, "callbacks", "detail", callbackUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: Callback }>(endpoints.callbacks.show(callbackUuid ?? ""))
        .then((r) => r.data.data),
    enabled: callbackUuid !== null,
    retry: retrySkipping404,
    refetchInterval: (query) =>
      query.state.data && isActive(query.state.data) ? 4000 : false,
  });
}

export function useCreateCallback(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Callback, ApiError, StoreCallbackPayload>({
    mutationFn: (payload) =>
      api.post<{ data: Callback }>(endpoints.callbacks.index, payload).then((r) => r.data.data),
    onSuccess: () => invalidateCallbackData(queryClient, businessUuid),
  });
}

export function useUpdateCallback(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Callback, ApiError, { id: string; payload: UpdateCallbackPayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Callback }>(endpoints.callbacks.show(id), payload).then((r) => r.data.data),
    onSuccess: () => invalidateCallbackData(queryClient, businessUuid),
  });
}

export function useRescheduleCallback(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Callback, ApiError, { id: string; scheduled_at: string }>({
    mutationFn: ({ id, scheduled_at }) =>
      api
        .post<{ data: Callback }>(endpoints.callbacks.reschedule(id), { scheduled_at })
        .then((r) => r.data.data),
    onSuccess: () => invalidateCallbackData(queryClient, businessUuid),
  });
}

export function useCancelCallback(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Callback, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Callback }>(endpoints.callbacks.cancel(id)).then((r) => r.data.data),
    onSuccess: () => invalidateCallbackData(queryClient, businessUuid),
  });
}

export function useCompleteCallback(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Callback, ApiError, { id: string; payload: CompleteCallbackPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .post<{ data: Callback }>(endpoints.callbacks.complete(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidateCallbackData(queryClient, businessUuid),
  });
}
