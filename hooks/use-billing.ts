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
  BillingAggregate,
  BillingCharge,
  BillingSetupSession,
  ChangePlanPreview,
  CursorPaginated,
  PlanChangePayload,
  PlanEntitlements,
  Subscription,
  UsageSnapshot,
} from "@/lib/api/types";
import { PLAN_ENTITLEMENT_DEFAULTS } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { useBusiness } from "@/components/business/business-provider";

const CHARGES_PAGE_SIZE = 25;

/** PHP serializes the no-period usage snapshot as an empty JSON array. */
type RawBillingAggregate = Omit<BillingAggregate, "usage"> & {
  usage: UsageSnapshot | unknown[] | null;
};

function normalizeAggregate(raw: RawBillingAggregate): BillingAggregate {
  return {
    ...raw,
    usage: raw.usage !== null && !Array.isArray(raw.usage) ? raw.usage : null,
  };
}

/**
 * Subscribing, changing plan or attaching a card can unlock (or re-price)
 * the whole portal — drop every cached query for the business so anything
 * that previously 402'd or was entitlement-shaped refetches fresh.
 */
function invalidateBusiness(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid) });
}

function invalidateBilling(queryClient: QueryClient, businessUuid: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessUuid, "billing") });
}

/** The GET /billing aggregate: subscription, usage, setup fee flag, recent charges. */
export function useBilling(businessUuid: string) {
  return useQuery<BillingAggregate, ApiError>({
    queryKey: queryKeys.business(businessUuid, "billing"),
    queryFn: () =>
      api
        .get<{ data: RawBillingAggregate }>(endpoints.billing.show)
        .then((r) => normalizeAggregate(r.data.data)),
    // A pending subscription with a card is one gateway webhook away from
    // activating — poll briefly so the page flips without a manual refresh.
    refetchInterval: (query) => {
      const subscription = query.state.data?.subscription;
      return subscription?.status === "pending" && subscription.has_payment_method ? 4000 : false;
    },
  });
}

/** Full charge history (GET /billing/charges), cursor-paginated. */
export function useBillingChargesInfinite(businessUuid: string) {
  return useInfiniteQuery<
    CursorPaginated<BillingCharge>,
    ApiError,
    InfiniteData<CursorPaginated<BillingCharge>>,
    QueryKey,
    string | null
  >({
    queryKey: queryKeys.business(businessUuid, "billing", "charges"),
    queryFn: ({ pageParam }) =>
      api
        .get<CursorPaginated<BillingCharge>>(endpoints.billing.charges, {
          params: { per_page: CHARGES_PAGE_SIZE, cursor: pageParam ?? undefined },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.next_cursor,
  });
}

export function useSubscribe(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, ApiError, PlanChangePayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Subscription }>(endpoints.billing.subscribe, payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidateBusiness(queryClient, businessUuid),
  });
}

export function useChangePlan(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, ApiError, PlanChangePayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Subscription }>(endpoints.billing.changePlan, payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidateBusiness(queryClient, businessUuid),
  });
}

/** Dry run of change-plan — exact charge today, or the scheduled date. */
export function useChangePlanPreview() {
  return useMutation<ChangePlanPreview, ApiError, PlanChangePayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: ChangePlanPreview }>(endpoints.billing.changePlanPreview, payload)
        .then((r) => r.data.data),
  });
}

/** Schedules cancellation at period end (ends pending/suspended outright). */
export function useCancelSubscription(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, ApiError, void>({
    mutationFn: () =>
      api.post<{ data: Subscription }>(endpoints.billing.cancel).then((r) => r.data.data),
    onSuccess: () => invalidateBilling(queryClient, businessUuid),
  });
}

export function useResumeSubscription(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, ApiError, void>({
    mutationFn: () =>
      api.post<{ data: Subscription }>(endpoints.billing.resume).then((r) => r.data.data),
    onSuccess: () => invalidateBilling(queryClient, businessUuid),
  });
}

/** Opens a gateway card-capture session (requires a subscription row). */
export function useSetupSession() {
  return useMutation<BillingSetupSession, ApiError, void>({
    mutationFn: () =>
      api
        .post<{ data: BillingSetupSession }>(endpoints.billing.setupSession)
        .then((r) => r.data.data),
  });
}

/**
 * Attaches the tokenized card. The backend resolves brand/last4/expiry from
 * the gateway itself and immediately charges whatever was blocked on a card
 * (initial charge, dunning retry) — hence the full-business invalidation.
 */
export function useStorePaymentMethod(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, ApiError, { token: string }>({
    mutationFn: (payload) =>
      api
        .post<{ data: Subscription }>(endpoints.billing.paymentMethod, payload)
        .then((r) => r.data.data),
    onSuccess: () => invalidateBusiness(queryClient, businessUuid),
  });
}

/**
 * The current business's resolved plan entitlements — plan JSON merged over
 * Starter-shaped defaults, mirroring the backend's Entitlements::for().
 * null while billing is loading or when there is no subscription/plan.
 */
export function useEntitlements(): Required<PlanEntitlements> | null {
  const { business } = useBusiness();
  const { data } = useBilling(business.id);
  const entitlements = data?.subscription?.plan?.entitlements;
  if (!entitlements) return null;
  return { ...PLAN_ENTITLEMENT_DEFAULTS, ...entitlements };
}
