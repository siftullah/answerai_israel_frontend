import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleGate } from "@/components/business/module-gate";
import { InvoicesView } from "@/components/invoices/invoices-view";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <ModuleGate module="invoices">
      <Suspense>
        <InvoicesView />
      </Suspense>
    </ModuleGate>
  );
}
