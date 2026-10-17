"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { Faq, FaqListFilters, FaqPayload } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/**
 * FAQ list. No filters = business-wide FAQs only; service_id/product_id
 * switch to that owner's own FAQs.
 */
export function useFaqs(businessUuid: string, filters: FaqListFilters = {}) {
  return useQuery<Faq[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "faqs", filters),
    queryFn: () =>
      api
        .get<{ data: Faq[] }>(endpoints.faqs.index, { params: filters })
        .then((r) => r.data.data),
  });
}

function invalidateFaqs(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "faqs") };
}

export function useCreateFaq(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Faq, ApiError, FaqPayload>({
    mutationFn: (payload) =>
      api.post<{ data: Faq }>(endpoints.faqs.index, payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFaqs(businessUuid));
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "faq-categories"),
      });
    },
  });
}

export function useUpdateFaq(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Faq, ApiError, { id: string; payload: FaqPayload }>({
    mutationFn: ({ id, payload }) =>
      api.patch<{ data: Faq }>(endpoints.faqs.show(id), payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFaqs(businessUuid));
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "faq-categories"),
      });
    },
  });
}

export function useDeleteFaq(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.faqs.show(id)).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFaqs(businessUuid));
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "faq-categories"),
      });
    },
  });
}

/**
 * Copies a business-wide FAQ into a service/product as an independently
 * editable owned FAQ. The backend also removes the source from the
 * owner's custom selection, so the owner lists refresh too.
 */
export function useDuplicateFaq(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<
    Faq,
    ApiError,
    { faqId: string; owner: { service_id: string } | { product_id: string } }
  >({
    mutationFn: ({ faqId, owner }) =>
      api.post<{ data: Faq }>(endpoints.faqs.duplicate(faqId), owner).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFaqs(businessUuid));
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "services") });
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "products") });
    },
  });
}
