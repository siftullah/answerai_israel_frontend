import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleGate } from "@/components/business/module-gate";
import { JobsView } from "@/components/jobs/jobs-view";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <ModuleGate module="jobs">
      <Suspense>
        <JobsView />
      </Suspense>
    </ModuleGate>
  );
}
