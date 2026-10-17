"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  TeamNotificationSettings,
  TeamNotificationTestResult,
  TeamNotificationType,
  UpdateTeamNotificationSettingsPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

function settingsKey(businessUuid: string) {
  return queryKeys.business(businessUuid, "notification-settings");
}

/** Every notification's routing settings in one read (defaults for the never-saved ones). */
export function useTeamNotificationSettings(businessUuid: string) {
  return useQuery<TeamNotificationSettings[], ApiError>({
    queryKey: settingsKey(businessUuid),
    queryFn: () =>
      api
        .get<{ data: TeamNotificationSettings[] }>(endpoints.notificationSettings.index)
        .then((r) => r.data.data),
  });
}

export function useUpdateTeamNotificationSettings(
  businessUuid: string,
  type: TeamNotificationType
) {
  const queryClient = useQueryClient();
  return useMutation<TeamNotificationSettings, ApiError, UpdateTeamNotificationSettingsPayload>({
    mutationFn: (payload) =>
      api
        .put<{ data: TeamNotificationSettings }>(
          endpoints.notificationSettings.settings(type),
          payload
        )
        .then((r) => r.data.data),
    // PUT echoes the saved row — splice it into the cached list.
    onSuccess: (data) =>
      queryClient.setQueryData<TeamNotificationSettings[]>(settingsKey(businessUuid), (list) =>
        list ? list.map((item) => (item.type === data.type ? data : item)) : list
      ),
  });
}

/**
 * Routes the latest AI-captured record of this kind using the SAVED settings and
 * reports who it would have gone to. Slow upstream (LLM) call; never retried.
 */
export function useTestTeamNotificationRouting(type: TeamNotificationType) {
  return useMutation<TeamNotificationTestResult, ApiError, void>({
    mutationFn: () =>
      api
        .post<{ data: TeamNotificationTestResult }>(endpoints.notificationSettings.test(type), {})
        .then((r) => r.data.data),
    retry: false,
  });
}
