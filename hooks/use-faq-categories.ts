"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { FaqCategory } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useFaqCategories(businessUuid: string) {
  return useQuery<FaqCategory[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "faq-categories"),
    queryFn: () =>
      api
        .get<{ data: FaqCategory[] }>(endpoints.faqCategories.index)
        .then((r) => r.data.data),
  });
}

/** Category changes ripple into FAQ rows (rename shows there; delete nulls). */
function invalidate(businessUuid: string, queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.business(businessUuid, "faq-categories"),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "faqs") });
}

export function useCreateFaqCategory(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<FaqCategory, ApiError, { name: string }>({
    mutationFn: (payload) =>
      api
        .post<{ data: FaqCategory }>(endpoints.faqCategories.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidate(businessUuid, queryClient),
  });
}

export function useUpdateFaqCategory(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<FaqCategory, ApiError, { id: string; name: string }>({
    mutationFn: ({ id, name }) =>
      api
        .patch<{ data: FaqCategory }>(endpoints.faqCategories.show(id), { name })
        .then((r) => r.data.data),
    onSuccess: () => invalidate(businessUuid, queryClient),
  });
}

export function useDeleteFaqCategory(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.faqCategories.show(id)).then(() => undefined),
    onSuccess: () => invalidate(businessUuid, queryClient),
  });
}
