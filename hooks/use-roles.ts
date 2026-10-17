"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { BusinessMemberRole } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useRoles(businessUuid: string) {
  return useQuery<BusinessMemberRole[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "roles"),
    queryFn: () =>
      api
        .get<{ data: BusinessMemberRole[] }>(endpoints.roles.index)
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
}
