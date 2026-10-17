"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  Appointment,
  AppointmentCounts,
  AppointmentListFilters,
  CursorPaginated,
  ReassignAppointmentPayload,
  StoreAppointmentPayload,
  UpdateAppointmentPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 25;

/**
 * Every appointment mutation refreshes the calendar views and the
 * contact-activity appointments list; slots too, since a booking consumes one.
 * The calls prefix keeps call detail's "created from this call" section in step.
 */
function invalidateAppointmentData(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calendar") });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.business(businessUuid, "appointments"),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "calls") });
}

/** Detail fetches: a 404 means deleted or foreign — expected, don't retry. */
function retrySkipping404(failureCount: number, error: ApiError) {
  return error.status !== 404 && failureCount < 2;
}

/**
 * The appointments page rail. Agents book during live calls, so a gentle
 * interval keeps open tabs honest without hammering the index.
 */
export function useAppointmentsInfinite(businessUuid: string, filters: AppointmentListFilters) {
  return useInfiniteQuery<
    CursorPaginated<Appointment>,
    ApiError,
    InfiniteData<CursorPaginated<Appointment>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "appointments", "list", filters),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<Appointment>>(endpoints.appointments.index, {
          params: {
            ...filters,
            needs_review: filters.needs_review ? 1 : undefined,
            per_page: PAGE_SIZE,
            cursor: pageParam ?? undefined,
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
    refetchInterval: 60_000,
  });
}

/** Tab badges. Cheap COUNTs; the interval keeps "today" honest over time. */
export function useAppointmentCounts(businessUuid: string, options?: { enabled?: boolean }) {
  return useQuery<AppointmentCounts, ApiError>({
    queryKey: queryKeys.business(businessUuid, "appointments", "counts"),
    queryFn: () =>
      api.get<{ data: AppointmentCounts }>(endpoints.appointments.counts).then((r) => r.data.data),
    refetchInterval: 30_000,
    enabled: options?.enabled ?? true,
  });
}

/** Requires the appointments module — pass null while it's disabled. */
export function useAppointment(businessUuid: string, appointmentUuid: string | null) {
  return useQuery<Appointment, ApiError>({
    queryKey: queryKeys.business(businessUuid, "appointments", "detail", appointmentUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: Appointment }>(endpoints.appointments.show(appointmentUuid ?? ""))
        .then((r) => r.data.data),
    enabled: appointmentUuid !== null,
    retry: retrySkipping404,
  });
}

export function useCreateAppointment(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, StoreAppointmentPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Appointment }>(endpoints.appointments.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidateAppointmentData(queryClient, businessUuid),
  });
}

function useTransition(businessUuid: string, path: (uuid: string) => string) {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, string>({
    mutationFn: (id) => api.post<{ data: Appointment }>(path(id)).then((r) => r.data.data),
    onSuccess: () => invalidateAppointmentData(queryClient, businessUuid),
  });
}

export function useConfirmAppointment(businessUuid: string) {
  return useTransition(businessUuid, endpoints.appointments.confirm);
}

export function useCompleteAppointment(businessUuid: string) {
  return useTransition(businessUuid, endpoints.appointments.complete);
}

export function useMarkAppointmentNoShow(businessUuid: string) {
  return useTransition(businessUuid, endpoints.appointments.noShow);
}

export function useCancelAppointment(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      api
        .post<{ data: Appointment }>(endpoints.appointments.cancel(id), {
          ...(reason ? { reason } : {}),
        })
        .then((r) => r.data.data),
    onSuccess: () => invalidateAppointmentData(queryClient, businessUuid),
  });
}

export function useRescheduleAppointment(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, { id: string; starts_at: string }>({
    mutationFn: ({ id, starts_at }) =>
      api
        .post<{ data: Appointment }>(endpoints.appointments.reschedule(id), { starts_at })
        .then((r) => r.data.data),
    onSuccess: () => invalidateAppointmentData(queryClient, businessUuid),
  });
}

export function useReassignAppointment(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, { id: string } & ReassignAppointmentPayload>({
    mutationFn: ({ id, member_id }) =>
      api
        .post<{ data: Appointment }>(endpoints.appointments.reassign(id), { member_id })
        .then((r) => r.data.data),
    onSuccess: () => invalidateAppointmentData(queryClient, businessUuid),
  });
}

export function useUpdateAppointment(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, { id: string; payload: UpdateAppointmentPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: Appointment }>(endpoints.appointments.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidateAppointmentData(queryClient, businessUuid),
  });
}
