"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  RelatedAppointment,
  RelatedInvoice,
  RelatedJob,
  RelatedLead,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** 403 = module disabled, 404 = gone — both expected, don't retry. */
function retrySkippingExpected(failureCount: number, error: ApiError) {
  return error.status !== 403 && error.status !== 404 && failureCount < 2;
}

/**
 * Contact-scoped module lists. The backend indexes are unpaginated
 * (per-contact volume is small) and the full resources are structural
 * supersets of the Related* slim types, so those are reused here.
 * Keys sit under (uuid, "<module>", "list", {contact_id}) — prefix-compatible
 * with future full module pages.
 */
function useContactModuleList<T>(
  businessUuid: string,
  moduleKey: string,
  path: string,
  contactUuid: string,
  enabled: boolean
) {
  return useQuery<T[], ApiError>({
    queryKey: queryKeys.business(businessUuid, moduleKey, "list", { contact_id: contactUuid }),
    queryFn: () =>
      api
        .get<{ data: T[] }>(path, { params: { contact_id: contactUuid } })
        .then((r) => r.data.data),
    enabled,
    retry: retrySkippingExpected,
  });
}

export function useContactAppointments(businessUuid: string, contactUuid: string, enabled: boolean) {
  return useContactModuleList<RelatedAppointment>(
    businessUuid,
    "appointments",
    endpoints.appointments.index,
    contactUuid,
    enabled
  );
}

export function useContactLeads(businessUuid: string, contactUuid: string, enabled: boolean) {
  return useContactModuleList<RelatedLead>(
    businessUuid,
    "leads",
    endpoints.leads.index,
    contactUuid,
    enabled
  );
}

export function useContactJobs(businessUuid: string, contactUuid: string, enabled: boolean) {
  return useContactModuleList<RelatedJob>(
    businessUuid,
    "jobs",
    endpoints.jobs.index,
    contactUuid,
    enabled
  );
}

export function useContactInvoices(businessUuid: string, contactUuid: string, enabled: boolean) {
  return useContactModuleList<RelatedInvoice>(
    businessUuid,
    "invoices",
    endpoints.invoices.index,
    contactUuid,
    enabled
  );
}
