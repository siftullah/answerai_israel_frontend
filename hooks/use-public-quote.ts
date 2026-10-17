"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { PublicQuote } from "@/lib/api/types";

/**
 * The unauthenticated /q/{token} surface. No business scoping — the token is
 * the whole identity, so keys are rooted on it rather than a business uuid.
 */

function queryKey(token: string) {
  return ["public-quote", token];
}

export function usePublicQuote(token: string) {
  return useQuery<PublicQuote, ApiError>({
    queryKey: queryKey(token),
    queryFn: () =>
      api.get<{ data: PublicQuote }>(endpoints.publicQuotes.show(token)).then((r) => r.data.data),
    // A 404 is a dead link and a 422-family state never self-heals — don't hammer.
    retry: (failureCount, error) => error.status >= 500 && failureCount < 2,
  });
}

export function useAcceptPublicQuote(token: string) {
  const queryClient = useQueryClient();
  return useMutation<PublicQuote, ApiError, void>({
    mutationFn: () =>
      api
        .post<{ data: PublicQuote }>(endpoints.publicQuotes.accept(token))
        .then((r) => r.data.data),
    onSuccess: (data) => queryClient.setQueryData(queryKey(token), data),
    // The quote may have expired or been withdrawn since the page loaded.
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKey(token) }),
  });
}

export function useDeclinePublicQuote(token: string) {
  const queryClient = useQueryClient();
  return useMutation<PublicQuote, ApiError, { reason?: string }>({
    mutationFn: ({ reason }) =>
      api
        .post<{ data: PublicQuote }>(endpoints.publicQuotes.decline(token), {
          reason: reason ?? null,
        })
        .then((r) => r.data.data),
    onSuccess: (data) => queryClient.setQueryData(queryKey(token), data),
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKey(token) }),
  });
}
