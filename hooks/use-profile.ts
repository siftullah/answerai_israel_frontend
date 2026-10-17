"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  Membership,
  UpdatePasswordPayload,
  UpdateProfilePayload,
  User,
  UserAvatar,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** PATCH /me echoes the updated account + membership. */
export interface ProfileUpdateResponse {
  user: User;
  membership: Membership | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<ProfileUpdateResponse, ApiError, UpdateProfilePayload>({
    mutationFn: (payload) =>
      api.patch<ProfileUpdateResponse>(endpoints.profile.update, payload).then((r) => r.data),
    // Name/email/phone/position all surface through /me — and the business
    // provider derives its membership from that same query — so one
    // invalidation refreshes the form, the sidebar rail and the account menu.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useUpdatePassword() {
  return useMutation<void, ApiError, UpdatePasswordPayload>({
    mutationFn: (payload) =>
      api.put(endpoints.profile.password, payload).then(() => undefined),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation<UserAvatar, ApiError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("avatar", file);
      return api
        .post<{ data: UserAvatar }>(endpoints.profile.avatar, form)
        .then((r) => r.data.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => api.delete(endpoints.profile.avatar).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
