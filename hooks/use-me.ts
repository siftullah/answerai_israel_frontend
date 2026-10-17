"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { MeResponse } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/**
 * The auth source of truth. A 401 lands in `error` (the client exempts /me
 * from the hard redirect) and means "logged out".
 */
export function useMe() {
  return useQuery<MeResponse, ApiError>({
    queryKey: queryKeys.me,
    queryFn: () => api.get<MeResponse>(endpoints.me).then((r) => r.data),
  });
}
