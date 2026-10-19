import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ModuleGate } from "@/components/business/module-gate";
import { JobsView } from "@/components/jobs/jobs-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobs");
  return { title: t("meta.title") };
}

export default function JobsPage() {
  return (
    <ModuleGate module="jobs">
      <Suspense>
        <JobsView />
      </Suspense>
    </ModuleGate>
  );
}
