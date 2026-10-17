"use client";

import { useBusinessProfile } from "@/hooks/use-business-profile";

/**
 * The business-level tax defaults (business profile), shared by invoices and
 * quotes. Fallbacks mirror the backend's config('invoices.default_*') values
 * so totals preview correctly while the profile loads.
 */
export function useTaxDefaults(businessUuid: string) {
  const profileQuery = useBusinessProfile(businessUuid);

  return {
    taxRateBp: profileQuery.data?.tax_rate_bp ?? 1000,
    taxLabel: profileQuery.data?.tax_label ?? "GST",
    isPending: profileQuery.isPending,
  };
}
