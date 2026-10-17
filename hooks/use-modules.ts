"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { BusinessModule, ModuleKey } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/**
 * Module enablement for a business (all module keys, with an enabled flag
 * each). The X-Business-Identifier header rides in from the /b/{uuid} URL
 * via the api client. Business profile → Modules is the only writer, and it
 * seeds this cache directly (see useUpdateModules).
 */
export function useModules(businessUuid: string | undefined) {
  return useQuery<BusinessModule[], ApiError>({
    queryKey: queryKeys.business(businessUuid ?? "", "modules"),
    queryFn: () =>
      api.get<{ data: BusinessModule[] }>(endpoints.modules.index).then((r) => r.data.data),
    enabled: Boolean(businessUuid),
    // Modules only change from the Modules screen — the global 30s default
    // would refetch on every window focus for nothing.
    staleTime: 5 * 60_000,
  });
}

/**
 * Effective settings for one enabled module — config defaults overlaid with
 * what the business stored. 403 = module disabled; callers gate on enablement
 * so that's not retried.
 */
export function useModuleSettings<T>(businessUuid: string, key: ModuleKey, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: queryKeys.business(businessUuid, "modules", "settings", key),
    queryFn: () => api.get<{ data: T }>(endpoints.modules.settings(key)).then((r) => r.data.data),
    enabled,
    retry: (failureCount, error) => error.status !== 403 && failureCount < 2,
    staleTime: 5 * 60_000,
  });
}

/**
 * Replace one module's settings bag. The endpoint stores the validated bag
 * *as-is* (no merge), so callers must send every key they want kept — build
 * the payload from the full effective settings, not a delta.
 */
export function useUpdateModuleSettings(businessUuid: string, key: ModuleKey) {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, Record<string, unknown>>({
    mutationFn: (settings) =>
      api.put(endpoints.modules.settings(key), { settings }).then((r) => r.data),
    // The PUT echoes the raw stored bag; readers expect the config-merged view,
    // so refetch instead of seeding.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.business(businessUuid, "modules", "settings", key),
      }),
  });
}

/**
 * Sync the enabled set. The endpoint takes the *full* desired list, not a
 * delta, and owner/admin only (a member's PUT 403s).
 *
 * Seeding the cache from the echoed response is what makes the sidebar react
 * instantly: the business layout's useModules re-renders, which updates the
 * BusinessProvider value every module-gated surface reads from.
 */
export function useUpdateModules(businessUuid: string) {
  const queryClient = useQueryClient();

  return useMutation<BusinessModule[], ApiError, ModuleKey[]>({
    mutationFn: (enabled) =>
      api
        .put<{ data: BusinessModule[] }>(endpoints.modules.index, { enabled })
        .then((r) => r.data.data),
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.business(businessUuid, "modules"), data),
  });
}
