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
  Quote,
  QuoteCounts,
  QuoteItemPayload,
  QuoteListFilters,
  StoreQuotePayload,
  UpdateQuotePayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** Detail fetches: a 404 means deleted or foreign — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/**
 * Every quote mutation invalidates the calls prefix too: the call detail's
 * related section lists quotes requested on the call. Conversion also touches
 * invoices, so that prefix rides along for the one mutation that creates one.
 */
function invalidateQuoteData(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "quotes") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") });
}

export function useQuotesInfinite(businessUuid: string, filters: QuoteListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Quote>,
    ApiError,
    InfiniteData<CursorPaginated<Quote>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "quotes", "page", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Quote>>(endpoints.quotes.index, {
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
export function useQuoteCounts(businessUuid: string, options?: { enabled?: boolean }) {
  return useQuery<QuoteCounts, ApiError>({
    queryKey: queryKeys.business(businessUuid, "quotes", "counts"),
    queryFn: () =>
      api.get<{ data: QuoteCounts }>(endpoints.quotes.counts).then((r) => r.data.data),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useQuoteDetail(businessUuid: string, quoteUuid: string | null) {
  return useQuery<Quote, ApiError>({
    queryKey: queryKeys.business(businessUuid, "quotes", "detail", quoteUuid ?? ""),
    queryFn: () =>
      api.get<{ data: Quote }>(endpoints.quotes.show(quoteUuid ?? "")).then((r) => r.data.data),
    enabled: quoteUuid !== null,
    retry: retrySkipping404,
  });
}

export function useCreateQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, StoreQuotePayload>({
    mutationFn: (payload) =>
      api.post<{ data: Quote }>(endpoints.quotes.index, payload).then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useUpdateQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, { id: string; payload: UpdateQuotePayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Quote }>(endpoints.quotes.show(id), payload).then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useReplaceQuoteItems(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, { id: string; items: QuoteItemPayload[] }>({
    mutationFn: ({ id, items }) =>
      api.put<{ data: Quote }>(endpoints.quotes.items(id), { items }).then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

/** crypto.randomUUID needs a secure context — dev runs on plain http. */
function idempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The send/resend envelope: the quote plus whether an email actually went out. */
export interface SendQuoteResult {
  quote: Quote;
  /** False = no recipient on file — share the public link instead. */
  emailed: boolean;
}

export function useSendQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<SendQuoteResult, ApiError, { id: string; to_email?: string }>({
    mutationFn: ({ id, to_email }) =>
      api
        .post<{ data: Quote; emailed?: boolean }>(
          endpoints.quotes.send(id),
          to_email ? { to_email } : {},
          // Guards double-submits — the backend replays the first result.
          { headers: { "Idempotency-Key": idempotencyKey() } }
        )
        .then((r) => ({ quote: r.data.data, emailed: r.data.emailed ?? true })),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useResendQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<SendQuoteResult, ApiError, { id: string; to_email?: string; valid_until?: string }>({
    mutationFn: ({ id, to_email, valid_until }) =>
      api
        .post<{ data: Quote; emailed?: boolean }>(endpoints.quotes.resend(id), {
          ...(to_email ? { to_email } : {}),
          ...(valid_until ? { valid_until } : {}),
        })
        .then((r) => ({ quote: r.data.data, emailed: r.data.emailed ?? true })),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useAcceptQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Quote }>(endpoints.quotes.accept(id)).then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useDeclineQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      api
        .post<{ data: Quote }>(endpoints.quotes.decline(id), { reason: reason ?? null })
        .then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useVoidQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Quote }>(endpoints.quotes.void(id)).then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useDuplicateQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Quote, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Quote }>(endpoints.quotes.duplicate(id)).then((r) => r.data.data),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

export function useConvertQuoteToInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, string>({
    mutationFn: (id) =>
      api
        .post<{ data: Invoice }>(endpoints.quotes.convertToInvoice(id))
        .then((r) => r.data.data),
    onSuccess: () => {
      invalidateQuoteData(queryClient, businessUuid);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "invoices"),
      });
    },
  });
}

export function useDeleteQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.quotes.show(id)).then(() => undefined),
    onSuccess: () => invalidateQuoteData(queryClient, businessUuid),
  });
}

/**
 * Accepted quote → job, copying line items and carrying the lead (which is
 * marked won). Leads ride the invalidation because of that status flip.
 */
export function useCreateJobFromQuote(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Job, ApiError, { quote_id: string }>({
    mutationFn: (payload) =>
      api.post<{ data: Job }>(endpoints.jobs.fromQuote, payload).then((r) => r.data.data),
    onSuccess: () => {
      invalidateQuoteData(queryClient, businessUuid);
      void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "jobs") });
      void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "leads") });
    },
  });
}
