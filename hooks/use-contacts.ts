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
  Contact,
  ContactBulkPayload,
  ContactBulkResult,
  ContactImportPayload,
  ContactImportPreview,
  ContactListFilters,
  ContactPayload,
  CursorPaginated,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** A 404 on the detail means "deleted / never existed" — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/** Index query params — booleans travel as 1/0. */
function toContactParams(filters: ContactListFilters) {
  return {
    ...filters,
    has_name: filters.has_name === undefined ? undefined : filters.has_name ? 1 : 0,
  };
}

export function useContactsInfinite(businessUuid: string, filters: ContactListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Contact>,
    ApiError,
    InfiniteData<CursorPaginated<Contact>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "contacts", "list", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Contact>>(endpoints.contacts.index, {
          params: {
            ...toContactParams(filters),
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
  });
}

export function useContact(businessUuid: string, contactUuid: string | null) {
  return useQuery<Contact, ApiError>({
    queryKey: queryKeys.business(businessUuid, "contacts", "detail", contactUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: Contact }>(endpoints.contacts.show(contactUuid ?? ""))
        .then((r) => r.data.data),
    enabled: contactUuid !== null,
    retry: retrySkipping404,
  });
}

export function useContactTags(businessUuid: string) {
  return useQuery<string[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "contacts", "tags"),
    queryFn: () => api.get<{ data: string[] }>(endpoints.contacts.tags).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

// Everything contact-shaped lives under the "contacts" prefix (list, detail,
// tags), so one descriptor invalidates them all together.
function invalidateContacts(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "contacts") };
}

/** DNC entries embed a contact join; contacts carry an on_dnc flag. */
function invalidateDnc(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "dnc") };
}

/** Call rows embed a contact block with a deleted flag. */
function invalidateCalls(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "calls") };
}

export function useCreateContact(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Contact, ApiError, ContactPayload>({
    mutationFn: (payload) =>
      api.post<{ data: Contact }>(endpoints.contacts.index, payload).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateContacts(businessUuid)),
  });
}

export function useUpdateContact(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Contact, ApiError, { id: string; payload: ContactPayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Contact }>(endpoints.contacts.show(id), payload).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateContacts(businessUuid)),
  });
}

export function useDeleteContact(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.contacts.show(id)).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateContacts(businessUuid));
      queryClient.invalidateQueries(invalidateDnc(businessUuid));
      queryClient.invalidateQueries(invalidateCalls(businessUuid));
    },
  });
}

export function useBulkContactAction(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<ContactBulkResult, ApiError, ContactBulkPayload>({
    mutationFn: (payload) =>
      api.post<ContactBulkResult>(endpoints.contacts.bulk, payload).then((r) => r.data),
    onSuccess: (_result, payload) => {
      queryClient.invalidateQueries(invalidateContacts(businessUuid));
      if (payload.action === "dnc" || payload.action === "delete") {
        queryClient.invalidateQueries(invalidateDnc(businessUuid));
      }
      if (payload.action === "delete") {
        queryClient.invalidateQueries(invalidateCalls(businessUuid));
      }
    },
  });
}

export function useContactsImportPreview() {
  return useMutation<ContactImportPreview, ApiError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<ContactImportPreview>(endpoints.contacts.importPreview, form)
        .then((r) => r.data);
    },
  });
}

export function useContactsImport(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ApiError, ContactImportPayload>({
    mutationFn: (payload) =>
      api.post<{ message: string }>(endpoints.contacts.import, payload).then((r) => r.data),
    // The queued import lands later, but a refetch on settle is harmless
    // and catches synchronous local-queue runs.
    onSuccess: () => queryClient.invalidateQueries(invalidateContacts(businessUuid)),
  });
}
