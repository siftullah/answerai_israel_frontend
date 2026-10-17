import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleGate } from "@/components/business/module-gate";
import { QuotesView } from "@/components/quotes/quotes-view";

export const metadata: Metadata = { title: "Quotes" };

export default function QuotesPage() {
  return (
    <ModuleGate module="quotes">
      <Suspense>
        <QuotesView />
      </Suspense>
    </ModuleGate>
  );
}
