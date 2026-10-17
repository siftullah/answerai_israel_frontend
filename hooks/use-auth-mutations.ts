"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  AcceptInvitationPayload,
  AcceptInvitationResponse,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  MessageResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<LoginResponse, ApiError, LoginPayload>({
    mutationFn: (payload) =>
      api.post<LoginResponse>(endpoints.auth.login, payload).then((r) => r.data),
    // Login response has the exact shape of /me — seed the cache directly.
    onSuccess: (data) => queryClient.setQueryData(queryKeys.me, data),
  });
}

export function useLogout() {
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => api.post(endpoints.auth.logout),
    // Hard navigation on purpose: wipes the QueryClient and all in-memory
    // state. Runs even if the request failed (session may already be dead).
    onSettled: () => window.location.assign("/login"),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<RegisterResponse, ApiError, RegisterPayload>({
    mutationFn: (payload) =>
      api.post<RegisterResponse>(endpoints.auth.register, payload).then((r) => r.data),
    // Response lacks memberships — refetch /me instead of seeding.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useForgotPassword() {
  return useMutation<MessageResponse, ApiError, ForgotPasswordPayload>({
    mutationFn: (payload) =>
      api.post<MessageResponse>(endpoints.auth.forgotPassword, payload).then((r) => r.data),
  });
}

export function useResetPassword() {
  return useMutation<MessageResponse, ApiError, ResetPasswordPayload>({
    mutationFn: (payload) =>
      api.post<MessageResponse>(endpoints.auth.resetPassword, payload).then((r) => r.data),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation<AcceptInvitationResponse, ApiError, AcceptInvitationPayload>({
    mutationFn: (payload) =>
      api.post<AcceptInvitationResponse>(endpoints.auth.acceptInvitation, payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useResendVerification() {
  return useMutation<MessageResponse, ApiError, void>({
    mutationFn: () =>
      api.post<MessageResponse>(endpoints.auth.resendVerification).then((r) => r.data),
  });
}
