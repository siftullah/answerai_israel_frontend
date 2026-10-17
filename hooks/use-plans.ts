"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { Plan } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/**
 * Public plans plus any custom plan pinned to this business, ordered by
 * price. Served outside the subscription gate — safe on the forced-landing
 * plans page for businesses with no subscription at all.
 */
export function usePlans(businessUuid: string) {
  return useQuery<Plan[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "plans"),
    queryFn: () => api.get<{ data: Plan[] }>(endpoints.plans).then((r) => r.data.data),
  });
}
