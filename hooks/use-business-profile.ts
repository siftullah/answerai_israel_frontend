"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  BusinessLogo,
  BusinessProfile,
  UpdateBusinessProfilePayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useBusinessProfile(businessUuid: string) {
  return useQuery<BusinessProfile, ApiError>({
    queryKey: queryKeys.business(businessUuid, "business-profile"),
    queryFn: () =>
      api
        .get<{ data: BusinessProfile }>(endpoints.businessProfile.show)
        .then((r) => r.data.data),
  });
}

export function useUpdateBusinessProfile(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessProfile, ApiError, UpdateBusinessProfilePayload>({
    mutationFn: (payload) =>
      api
        .patch<{ data: BusinessProfile }>(endpoints.businessProfile.show, payload)
        .then((r) => r.data.data),
    // PATCH returns the full updated profile — seed the cache directly.
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.business(businessUuid, "business-profile"), data),
  });
}

export function useUploadBusinessLogo(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<BusinessLogo, ApiError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("logo", file);
      return api
        .post<{ data: BusinessLogo }>(endpoints.businessProfile.logo, form)
        .then((r) => r.data.data);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "business-profile"),
      }),
  });
}

export function useDeleteBusinessLogo(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => api.delete(endpoints.businessProfile.logo).then(() => undefined),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "business-profile"),
      }),
  });
}
