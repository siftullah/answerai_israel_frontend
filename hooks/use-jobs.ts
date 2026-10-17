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
  Invoice,
  Job,
  JobActivity,
  JobCounts,
  JobLineItem,
  JobListFilters,
  JobPhoto,
  StoreJobLineItemPayload,
  StoreJobPayload,
  UpdateJobLineItemPayload,
  UpdateJobPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** Detail fetches: a 404 means deleted or foreign — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/**
 * Every job mutation invalidates the calls prefix too: the call detail's
 * related section lists jobs captured on the call, and the post-call pipeline
 * journals calls onto open jobs. Conversions and invoicing invalidate their
 * own extra prefixes at the call site.
 */
function invalidateJobData(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "jobs") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") });
}

export function useJobsInfinite(businessUuid: string, filters: JobListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Job>,
    ApiError,
    InfiniteData<CursorPaginated<Job>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "jobs", "page", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Job>>(endpoints.jobs.index, {
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
export function useJobCounts(businessUuid: string, options?: { enabled?: boolean }) {
  return useQuery<JobCounts, ApiError>({
    queryKey: queryKeys.business(businessUuid, "jobs", "counts"),
    queryFn: () =>
      api.get<{ data: JobCounts }>(endpoints.jobs.counts).then((r) => r.data.data),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useJobDetail(businessUuid: string, jobUuid: string | null) {
  return useQuery<Job, ApiError>({
    queryKey: queryKeys.business(businessUuid, "jobs", "detail", jobUuid ?? ""),
    queryFn: () =>
      api.get<{ data: Job }>(endpoints.jobs.show(jobUuid ?? "")).then((r) => r.data.data),
    enabled: jobUuid !== null,
    retry: retrySkipping404,
  });
}

/** The timeline, newest first — notes, transitions, bookings, and journaled calls. */
export function useJobActivities(businessUuid: string, jobUuid: string | null) {
  return useQuery<JobActivity[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "jobs", "activities", jobUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: JobActivity[] }>(endpoints.jobs.activities(jobUuid ?? ""))
        .then((r) => r.data.data),
    enabled: jobUuid !== null,
    retry: retrySkipping404,
  });
}

/** Site photos / attachments — signed, expiring URLs off the private disk. */
export function useJobPhotos(businessUuid: string, jobUuid: string | null) {
  return useQuery<JobPhoto[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "jobs", "photos", jobUuid ?? ""),
    queryFn: () =>
      api.get<{ data: JobPhoto[] }>(endpoints.jobs.photos(jobUuid ?? "")).then((r) => r.data.data),
    enabled: jobUuid !== null,
    retry: retrySkipping404,
  });
}

export function useCreateJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, StoreJobPayload>({
    mutationFn: (payload) =>
      api.post<{ data: Job }>(endpoints.jobs.index, payload).then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

/** Descriptive edits only — status moves through the transition hooks below. */
export function useUpdateJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, { id: string; payload: UpdateJobPayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Job }>(endpoints.jobs.show(id), payload).then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

export function useAddJobNote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<JobActivity, ApiError, { id: string; note: string }>({
    mutationFn: ({ id, note }) =>
      api
        .post<{ data: JobActivity }>(endpoints.jobs.activities(id), { note })
        .then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

export function useDeleteJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.jobs.show(id)).then(() => undefined),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

/** starts_at is a UTC instant; the backend derives the end from the estimate. */
export function useScheduleJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, { id: string; starts_at: string }>({
    mutationFn: ({ id, starts_at }) =>
      api.post<{ data: Job }>(endpoints.jobs.schedule(id), { starts_at }).then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

export function useRescheduleJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, { id: string; starts_at: string }>({
    mutationFn: ({ id, starts_at }) =>
      api
        .post<{ data: Job }>(endpoints.jobs.reschedule(id), { starts_at })
        .then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

function useJobTransition(businessUuid: string, path: (uuid: string) => string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, string>({
    mutationFn: (id) => api.post<{ data: Job }>(path(id), {}).then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

export function useStartJob(businessUuid: string) {
  return useJobTransition(businessUuid, endpoints.jobs.start);
}

export function useCompleteJob(businessUuid: string) {
  return useJobTransition(businessUuid, endpoints.jobs.complete);
}

/** Back to unscheduled open — the team re-books deliberately. */
export function useReopenJob(businessUuid: string) {
  return useJobTransition(businessUuid, endpoints.jobs.reopen);
}

export function useCancelJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      api
        .post<{ data: Job }>(endpoints.jobs.cancel(id), reason ? { reason } : {})
        .then((r) => r.data.data),
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

/**
 * The items editor saves as a diff against per-item endpoints (jobs have no
 * PUT-replace like quotes): deletes first, then updates, then creates —
 * sequential so the backend's cached quote_cents lands on the final sum.
 */
export interface SaveJobLineItemsInput {
  jobId: string;
  deletes: string[];
  updates: { id: string; payload: UpdateJobLineItemPayload }[];
  creates: StoreJobLineItemPayload[];
}

export function useSaveJobLineItems(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, SaveJobLineItemsInput>({
    mutationFn: async ({ jobId, deletes, updates, creates }) => {
      for (const itemId of deletes) {
        await api.delete(endpoints.jobs.lineItem(jobId, itemId));
      }
      for (const { id, payload } of updates) {
        await api.patch<{ data: JobLineItem }>(endpoints.jobs.lineItem(jobId, id), payload);
      }
      for (const payload of creates) {
        await api.post<{ data: JobLineItem }>(endpoints.jobs.lineItems(jobId), payload);
      }
    },
    onSuccess: () => invalidateJobData(queryClient, businessUuid),
  });
}

export function useUploadJobPhoto(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<JobPhoto, ApiError, { jobId: string; file: File }>({
    mutationFn: ({ jobId, file }) => {
      const body = new FormData();
      body.append("file", file);
      return api
        .post<{ data: JobPhoto }>(endpoints.jobs.photos(jobId), body)
        .then((r) => r.data.data);
    },
    onSuccess: (_photo, { jobId }) =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "jobs", "photos", jobId),
      }),
  });
}

export function useDeleteJobPhoto(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { jobId: string; photoId: string }>({
    mutationFn: ({ jobId, photoId }) =>
      api.delete(endpoints.jobs.photo(jobId, photoId)).then(() => undefined),
    onSuccess: (_result, { jobId }) =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "jobs", "photos", jobId),
      }),
  });
}

/** Completed job → draft invoice, copying the line items (tax re-defaults). */
export function useCreateInvoiceFromJob(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, { job: Job }>({
    mutationFn: ({ job }) =>
      api
        .post<{ data: Invoice }>(endpoints.invoices.fromJob, { job_id: job.id })
        .then((r) => r.data.data),
    onSuccess: () => {
      invalidateJobData(queryClient, businessUuid);
      void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "invoices") });
    },
  });
}
