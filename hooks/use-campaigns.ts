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
  Campaign,
  CampaignListFilters,
  CreateCampaignPayload,
  CursorPaginated,
  UpdateCampaignPayload,
} from "@/lib/api/types";
import { TRANSITIONAL_CAMPAIGN_STATUSES } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/** A 404 on the detail means "deleted / never existed" — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/** The pacer is working this campaign — keep its data fresh. */
export function campaignIsTransitional(campaign: Campaign): boolean {
  return TRANSITIONAL_CAMPAIGN_STATUSES.includes(campaign.status);
}

function detailKey(businessUuid: string, campaignUuid: string) {
  return queryKeys.business(businessUuid, "campaigns", "detail", campaignUuid);
}

/** Prefix-matches the list, every detail and their nested recipient pages. */
function invalidateCampaigns(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "campaigns") };
}

/** All filter variants of the list, but no detail keys. */
function invalidateCampaignList(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "campaigns", "list") };
}

/** Campaign calls surface in the call log (rows embed a campaign block). */
function invalidateCalls(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "calls") };
}

export function useCampaignsInfinite(businessUuid: string, filters: CampaignListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Campaign>,
    ApiError,
    InfiniteData<CursorPaginated<Campaign>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "campaigns", "list", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Campaign>>(endpoints.campaigns.index, {
          params: {
            ...filters,
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
    // Keeps progress bars moving while any visible campaign is being paced.
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) => page.data.some(campaignIsTransitional))
        ? 4000
        : false,
  });
}

export function useCampaign(businessUuid: string, campaignUuid: string) {
  return useQuery<Campaign, ApiError>({
    queryKey: detailKey(businessUuid, campaignUuid),
    queryFn: () =>
      api
        .get<{ data: Campaign }>(endpoints.campaigns.show(campaignUuid))
        .then((r) => r.data.data),
    retry: retrySkipping404,
    refetchInterval: (query) =>
      query.state.data && campaignIsTransitional(query.state.data) ? 4000 : false,
  });
}

export function useCreateCampaign(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Campaign, ApiError, CreateCampaignPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Campaign }>(endpoints.campaigns.index, payload)
        .then((r) => r.data.data),
    onSuccess: (campaign) => {
      // Seed the detail the create modal is about to navigate to.
      queryClient.setQueryData(detailKey(businessUuid, campaign.id), campaign);
      queryClient.invalidateQueries(invalidateCampaignList(businessUuid));
    },
  });
}

export function useUpdateCampaign(businessUuid: string, campaignUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Campaign, ApiError, UpdateCampaignPayload>({
    mutationFn: (payload) =>
      api
        .patch<{ data: Campaign }>(endpoints.campaigns.show(campaignUuid), payload)
        .then((r) => r.data.data),
    onSuccess: (campaign) => {
      // Update responses load calling_hours, so a straight replace is safe.
      queryClient.setQueryData(detailKey(businessUuid, campaignUuid), campaign);
      queryClient.invalidateQueries(invalidateCampaignList(businessUuid));
    },
  });
}

export function useDeleteCampaign(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (campaignUuid) =>
      api.delete(endpoints.campaigns.show(campaignUuid)).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateCampaigns(businessUuid));
      queryClient.invalidateQueries(invalidateCalls(businessUuid));
    },
  });
}

export function useDuplicateCampaign(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Campaign, ApiError, string>({
    mutationFn: (campaignUuid) =>
      api
        .post<{ data: Campaign }>(endpoints.campaigns.duplicate(campaignUuid))
        .then((r) => r.data.data),
    onSuccess: (campaign) => {
      // The duplicate response loads calling_hours — seed the draft's detail.
      queryClient.setQueryData(detailKey(businessUuid, campaign.id), campaign);
      queryClient.invalidateQueries(invalidateCampaignList(businessUuid));
    },
  });
}

function useLifecycleMutation(businessUuid: string, path: (uuid: string) => string) {
  const queryClient = useQueryClient();
  return useMutation<Campaign, ApiError, string>({
    mutationFn: (campaignUuid) =>
      api.post<{ data: Campaign }>(path(campaignUuid)).then((r) => r.data.data),
    onSuccess: (campaign) => {
      // Lifecycle responses omit calling_hours — merge, never replace, or the
      // Settings tab silently flips a custom-hours campaign to "inherit".
      queryClient.setQueryData<Campaign>(detailKey(businessUuid, campaign.id), (old) =>
        old ? { ...campaign, calling_hours: old.calling_hours } : campaign
      );
      queryClient.invalidateQueries(invalidateCampaignList(businessUuid));
      // Start dials new calls; cancel kills queued ones.
      queryClient.invalidateQueries(invalidateCalls(businessUuid));
    },
  });
}

export function useStartCampaign(businessUuid: string) {
  return useLifecycleMutation(businessUuid, endpoints.campaigns.start);
}

export function usePauseCampaign(businessUuid: string) {
  return useLifecycleMutation(businessUuid, endpoints.campaigns.pause);
}

export function useResumeCampaign(businessUuid: string) {
  return useLifecycleMutation(businessUuid, endpoints.campaigns.resume);
}

export function useCancelCampaign(businessUuid: string) {
  return useLifecycleMutation(businessUuid, endpoints.campaigns.cancel);
}
