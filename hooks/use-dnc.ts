"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { CursorPaginated, DncEntry, DncEntryPayload, DncListFilters } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

export function useDncInfinite(businessUuid: string, filters: DncListFilters) {
  return useInfiniteQuery<
    CursorPaginated<DncEntry>,
    ApiError,
    InfiniteData<CursorPaginated<DncEntry>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "dnc", "list", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<DncEntry>>(endpoints.dnc.index, {
          params: { ...filters, per_page: PAGE_SIZE, cursor: pageParam ?? undefined },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
  });
}

// DNC mutations also invalidate contacts: every contact carries an on_dnc
// flag joined against this list.
function invalidateDncAndContacts(queryClient: ReturnType<typeof useQueryClient>, uuid: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.business(uuid, "dnc") });
  queryClient.invalidateQueries({ queryKey: queryKeys.business(uuid, "contacts") });
}

/** Restore-or-create: re-posting an existing number updates its reason. */
export function useAddDncEntry(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<DncEntry, ApiError, DncEntryPayload>({
    mutationFn: (payload) =>
      api.post<{ data: DncEntry }>(endpoints.dnc.index, payload).then((r) => r.data.data),
    onSuccess: () => invalidateDncAndContacts(queryClient, businessUuid),
  });
}

export function useRemoveDncEntry(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.dnc.show(id)).then(() => undefined),
    onSuccess: () => invalidateDncAndContacts(queryClient, businessUuid),
  });
}
