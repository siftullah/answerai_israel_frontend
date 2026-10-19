import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ModuleGate } from "@/components/business/module-gate";
import { QuotesView } from "@/components/quotes/quotes-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("quotes");
  return { title: t("meta.title") };
}

export default function QuotesPage() {
  return (
    <ModuleGate module="quotes">
      <Suspense>
        <QuotesView />
      </Suspense>
    </ModuleGate>
  );
}
