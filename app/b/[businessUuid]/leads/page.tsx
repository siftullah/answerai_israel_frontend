import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleGate } from "@/components/business/module-gate";
import { LeadsView } from "@/components/leads/leads-view";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <ModuleGate module="leads">
      <Suspense>
        <LeadsView />
      </Suspense>
    </ModuleGate>
  );
}
