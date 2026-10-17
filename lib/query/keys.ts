/**
 * Query-key conventions:
 * - Global (business-independent) data uses named keys: queryKeys.me
 * - Business-scoped data ALWAYS starts with the business uuid so that
 *   switching businesses can never serve stale cache from another one:
 *   queryKeys.business(uuid, "agents", filters)
 */
export const queryKeys = {
  me: ["me"] as const,
  businesses: ["businesses"] as const,
  business: (uuid: string, ...rest: readonly unknown[]) => [uuid, ...rest] as const,
};
