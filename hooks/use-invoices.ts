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
  InvoiceCounts,
  InvoiceItemPayload,
  InvoiceListFilters,
  StoreInvoicePayload,
  UpdateInvoicePayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** Detail fetches: a 404 means deleted or foreign — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/**
 * Every invoice mutation invalidates the calls prefix too: the call detail's
 * related section lists invoices raised on the call. The invoices prefix also
 * covers the contact-activity card (keyed under "invoices", "list").
 */
function invalidateInvoiceData(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "invoices") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") });
}

export function useInvoicesInfinite(businessUuid: string, filters: InvoiceListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Invoice>,
    ApiError,
    InfiniteData<CursorPaginated<Invoice>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "invoices", "page", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Invoice>>(endpoints.invoices.index, {
          params: {
            ...filters,
            overdue_only: filters.overdue_only ? 1 : undefined,
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
export function useInvoiceCounts(businessUuid: string, options?: { enabled?: boolean }) {
  return useQuery<InvoiceCounts, ApiError>({
    queryKey: queryKeys.business(businessUuid, "invoices", "counts"),
    queryFn: () =>
      api.get<{ data: InvoiceCounts }>(endpoints.invoices.counts).then((r) => r.data.data),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useInvoiceDetail(businessUuid: string, invoiceUuid: string | null) {
  return useQuery<Invoice, ApiError>({
    queryKey: queryKeys.business(businessUuid, "invoices", "detail", invoiceUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: Invoice }>(endpoints.invoices.show(invoiceUuid ?? ""))
        .then((r) => r.data.data),
    enabled: invoiceUuid !== null,
    retry: retrySkipping404,
  });
}

export function useCreateInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, StoreInvoicePayload>({
    mutationFn: (payload) =>
      api.post<{ data: Invoice }>(endpoints.invoices.index, payload).then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

export function useUpdateInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, { id: string; payload: UpdateInvoicePayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Invoice }>(endpoints.invoices.show(id), payload).then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

export function useReplaceInvoiceItems(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, { id: string; items: InvoiceItemPayload[] }>({
    mutationFn: ({ id, items }) =>
      api
        .put<{ data: Invoice }>(endpoints.invoices.items(id), { items })
        .then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

/** crypto.randomUUID needs a secure context — dev runs on plain http. */
function idempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSendInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, { id: string; to_email?: string }>({
    mutationFn: ({ id, to_email }) =>
      api
        .post<{ data: Invoice }>(
          endpoints.invoices.send(id),
          to_email ? { to_email } : {},
          // Guards double-submits — the backend replays the first result.
          { headers: { "Idempotency-Key": idempotencyKey() } }
        )
        .then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

export function useMarkInvoicePaid(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, { id: string; payment_reference?: string }>({
    mutationFn: ({ id, payment_reference }) =>
      api
        .post<{ data: Invoice }>(endpoints.invoices.markPaid(id), {
          payment_reference: payment_reference ?? null,
        })
        .then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

export function useVoidInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Invoice }>(endpoints.invoices.void(id)).then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

export function useDuplicateInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, string>({
    mutationFn: (id) =>
      api.post<{ data: Invoice }>(endpoints.invoices.duplicate(id)).then((r) => r.data.data),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}

export function useDeleteInvoice(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.invoices.show(id)).then(() => undefined),
    onSuccess: () => invalidateInvoiceData(queryClient, businessUuid),
  });
}
