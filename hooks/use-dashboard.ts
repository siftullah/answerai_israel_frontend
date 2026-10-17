"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { DashboardSummary } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** The home page's aggregate — kept honest on the same cadence as the counts hooks. */
export function useDashboard(businessUuid: string) {
  return useQuery<DashboardSummary, ApiError>({
    queryKey: queryKeys.business(businessUuid, "dashboard"),
    queryFn: () =>
      api.get<{ data: DashboardSummary }>(endpoints.dashboard).then((r) => r.data.data),
    refetchInterval: 60_000,
  });
}
