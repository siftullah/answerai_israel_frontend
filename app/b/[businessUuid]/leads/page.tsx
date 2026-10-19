import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ModuleGate } from "@/components/business/module-gate";
import { LeadsView } from "@/components/leads/leads-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leads");
  return { title: t("meta.title") };
}

export default function LeadsPage() {
  return (
    <ModuleGate module="leads">
      <Suspense>
        <LeadsView />
      </Suspense>
    </ModuleGate>
  );
}
