"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { AddressSearchResult } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

/**
 * Debounced Mappify address lookup. The backend answers 503 while
 * MAPPIFY_API_KEY is unset and 502 when the upstream is down — both are
 * surfaced as flags so the field can degrade to manual entry instead of
 * erroring.
 */
export function useAddressSearch(businessUuid: string, rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 300);
  const enabled = query.length >= 3;

  const result = useQuery<AddressSearchResult[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "address-search", query),
    queryFn: () =>
      api
        .get<{ data: AddressSearchResult[] }>(endpoints.addressSearch, {
          params: { q: query },
        })
        .then((r) => r.data.data),
    enabled,
    staleTime: 5 * 60_000,
    // 503/502 are stable states, not transient failures — don't hammer.
    retry: false,
  });

  return {
    ...result,
    /** MAPPIFY_API_KEY unset on the backend — search permanently off. */
    notConfigured: result.error?.status === 503,
    /** Upstream (Mappify) failed — search off for now. */
    unavailable: result.error?.status === 502,
  };
}
