import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleGate } from "@/components/business/module-gate";
import { CallbacksView } from "@/components/callbacks/callbacks-view";

export const metadata: Metadata = { title: "Callbacks" };

export default function CallbacksPage() {
  return (
    <ModuleGate module="callbacks">
      <Suspense>
        <CallbacksView />
      </Suspense>
    </ModuleGate>
  );
}
