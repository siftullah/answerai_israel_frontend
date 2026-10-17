"use client";

import { createContext, useContext } from "react";
import type { Business, BusinessModule, Membership, ModuleKey } from "@/lib/api/types";

interface BusinessContextValue {
  business: Business;
  membership: Membership;
  modules: BusinessModule[];
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({
  value,
  children,
}: {
  value: BusinessContextValue;
  children: React.ReactNode;
}) {
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

/** Current business + the user's membership in it. Only valid under /b/[businessUuid]. */
export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return ctx;
}

/** Whether a module is enabled for the current business. */
export function useModuleEnabled(key: ModuleKey): boolean {
  const { modules } = useBusiness();
  return modules.some((m) => m.key === key && m.enabled);
}
