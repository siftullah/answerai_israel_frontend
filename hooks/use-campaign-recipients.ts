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
import type {
  AddRecipientsPayload,
  CampaignImportPayload,
  CampaignImportPreview,
  CampaignRecipient,
  CursorPaginated,
  FromContactsPayload,
  FromContactsSummary,
  RecipientBulkDeletePayload,
  RecipientBulkDeleteResult,
  RecipientBulkRetryPayload,
  RecipientBulkRetryResult,
  RecipientListFilters,
  RecipientsSummary,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/**
 * Recipient mutations touch the campaign's stats blob (and the list's
 * progress bars), so they invalidate the whole campaigns prefix.
 */
function invalidateCampaigns(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "campaigns") };
}

/** Retried recipients get dialed again — call rows follow. */
function invalidateCalls(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "calls") };
}

/**
 * Rows churn while the pacer dials regardless of which page is visible, so
 * polling is driven by the PARENT campaign's status (plus a settling window
 * after a CSV import 202 — draft campaigns aren't transitional, and nothing
 * else would refresh the queued import's rows).
 */
export function useCampaignRecipientsInfinite(
  businessUuid: string,
  campaignUuid: string,
  filters: RecipientListFilters,
  options: { poll: boolean }
) {
  return useInfiniteQuery<
    CursorPaginated<CampaignRecipient>,
    ApiError,
    InfiniteData<CursorPaginated<CampaignRecipient>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(
      businessUuid,
      "campaigns",
      "detail",
      campaignUuid,
      "recipients",
      filters
    ),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<CampaignRecipient>>(endpoints.campaigns.recipients(campaignUuid), {
          params: {
            ...filters,
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
    refetchInterval: options.poll ? 4000 : false,
  });
}

export function useAddRecipients(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<RecipientsSummary, ApiError, AddRecipientsPayload>({
    mutationFn: (payload) =>
      api
        .post<{ summary: RecipientsSummary }>(
          endpoints.campaigns.recipients(campaignUuid),
          payload
        )
        .then((r) => r.data.summary),
    onSuccess: () => queryClient.invalidateQueries(invalidateCampaigns(businessUuid)),
  });
}

export function useAddRecipientsFromContacts(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<FromContactsSummary, ApiError, FromContactsPayload>({
    mutationFn: (payload) =>
      api
        .post<{ summary: FromContactsSummary }>(
          endpoints.campaigns.recipientsFromContacts(campaignUuid),
          payload
        )
        .then((r) => r.data.summary),
    onSuccess: () => queryClient.invalidateQueries(invalidateCampaigns(businessUuid)),
  });
}

export function useRecipientsImportPreview(campaignUuid: string) {
  return useMutation<CampaignImportPreview, ApiError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<CampaignImportPreview>(
          endpoints.campaigns.recipientsImportPreview(campaignUuid),
          form
        )
        .then((r) => r.data);
    },
  });
}

export function useRecipientsImport(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ApiError, CampaignImportPayload>({
    mutationFn: (payload) =>
      api
        .post<{ message: string }>(endpoints.campaigns.recipientsImport(campaignUuid), payload)
        .then((r) => r.data),
    // 202 — rows land as the queued job chews through the file; the settling
    // poll in the recipients tab picks them up.
    onSuccess: () => queryClient.invalidateQueries(invalidateCampaigns(businessUuid)),
  });
}

export function useRetryRecipient(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<CampaignRecipient, ApiError, string>({
    mutationFn: (recipientUuid) =>
      api
        .post<{ data: CampaignRecipient }>(
          endpoints.campaigns.recipientRetry(campaignUuid, recipientUuid)
        )
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateCampaigns(businessUuid));
      queryClient.invalidateQueries(invalidateCalls(businessUuid));
    },
  });
}

export function useBulkRetryRecipients(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<RecipientBulkRetryResult, ApiError, RecipientBulkRetryPayload>({
    mutationFn: (payload) =>
      api
        .post<RecipientBulkRetryResult>(
          endpoints.campaigns.recipientsBulkRetry(campaignUuid),
          payload
        )
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateCampaigns(businessUuid));
      queryClient.invalidateQueries(invalidateCalls(businessUuid));
    },
  });
}

export function useBulkDeleteRecipients(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<RecipientBulkDeleteResult, ApiError, RecipientBulkDeletePayload>({
    mutationFn: (payload) =>
      api
        .post<RecipientBulkDeleteResult>(
          endpoints.campaigns.recipientsBulkDelete(campaignUuid),
          payload
        )
        .then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateCampaigns(businessUuid)),
  });
}

export function useDeleteRecipient(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (recipientUuid) =>
      api
        .delete(endpoints.campaigns.recipient(campaignUuid, recipientUuid))
        .then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidateCampaigns(businessUuid)),
  });
}
