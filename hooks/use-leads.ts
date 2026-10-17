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
  CursorPaginated,
  Lead,
  LeadActivity,
  LeadCounts,
  LeadListFilters,
  Quote,
  RelatedJob,
  StoreLeadPayload,
  UpdateLeadPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** Detail fetches: a 404 means deleted or foreign — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/**
 * Every lead mutation invalidates the calls prefix too: the call detail's
 * related section lists leads captured on the call, and the post-call pipeline
 * journals calls onto open leads.
 */
function invalidateLeadData(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "leads") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") });
}

export function useLeadsInfinite(businessUuid: string, filters: LeadListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Lead>,
    ApiError,
    InfiniteData<CursorPaginated<Lead>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "leads", "page", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Lead>>(endpoints.leads.index, {
          params: {
            ...filters,
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
  });
}

/** Tab badges + stat tiles. Cheap COUNT/SUMs, kept honest on an interval. */
export function useLeadCounts(businessUuid: string, options?: { enabled?: boolean }) {
  return useQuery<LeadCounts, ApiError>({
    queryKey: queryKeys.business(businessUuid, "leads", "counts"),
    queryFn: () =>
      api.get<{ data: LeadCounts }>(endpoints.leads.counts).then((r) => r.data.data),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useLeadDetail(businessUuid: string, leadUuid: string | null) {
  return useQuery<Lead, ApiError>({
    queryKey: queryKeys.business(businessUuid, "leads", "detail", leadUuid ?? ""),
    queryFn: () =>
      api.get<{ data: Lead }>(endpoints.leads.show(leadUuid ?? "")).then((r) => r.data.data),
    enabled: leadUuid !== null,
    retry: retrySkipping404,
  });
}

/** The timeline, newest first — notes, status changes, and journaled calls. */
export function useLeadActivities(businessUuid: string, leadUuid: string | null) {
  return useQuery<LeadActivity[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "leads", "activities", leadUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: LeadActivity[] }>(endpoints.leads.activities(leadUuid ?? ""))
        .then((r) => r.data.data),
    enabled: leadUuid !== null,
    retry: retrySkipping404,
  });
}

export function useCreateLead(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Lead, ApiError, StoreLeadPayload>({
    mutationFn: (payload) =>
      api.post<{ data: Lead }>(endpoints.leads.index, payload).then((r) => r.data.data),
    onSuccess: () => invalidateLeadData(queryClient, businessUuid),
  });
}

/** Field edits and status transitions share this PATCH. */
export function useUpdateLead(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Lead, ApiError, { id: string; payload: UpdateLeadPayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Lead }>(endpoints.leads.show(id), payload).then((r) => r.data.data),
    onSuccess: () => invalidateLeadData(queryClient, businessUuid),
  });
}

export function useAddLeadNote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<LeadActivity, ApiError, { id: string; note: string }>({
    mutationFn: ({ id, note }) =>
      api
        .post<{ data: LeadActivity }>(endpoints.leads.activities(id), { note })
        .then((r) => r.data.data),
    onSuccess: () => invalidateLeadData(queryClient, businessUuid),
  });
}

export function useDeleteLead(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.leads.show(id)).then(() => undefined),
    onSuccess: () => invalidateLeadData(queryClient, businessUuid),
  });
}

/** The full job resource is a structural superset of RelatedJob. */
export function useConvertLeadToJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<RelatedJob, ApiError, { lead_id: string }>({
    mutationFn: (payload) =>
      api.post<{ data: RelatedJob }>(endpoints.jobs.fromLead, payload).then((r) => r.data.data),
    onSuccess: () => {
      invalidateLeadData(queryClient, businessUuid);
      void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "jobs") });
    },
  });
}

/** Drafts a quote linked back to the lead — priced up on the quotes page. */
export function useCreateQuoteFromLead(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, { lead: Lead }>({
    mutationFn: ({ lead }) =>
      api
        .post<{ data: Quote }>(endpoints.quotes.index, {
          contact_id: lead.contact?.id,
          lead_id: lead.id,
          title: lead.title,
        })
        .then((r) => r.data.data),
    onSuccess: () => {
      invalidateLeadData(queryClient, businessUuid);
      void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "quotes") });
    },
  });
}
