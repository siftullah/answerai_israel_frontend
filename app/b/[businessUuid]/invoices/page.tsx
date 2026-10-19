import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ModuleGate } from "@/components/business/module-gate";
import { InvoicesView } from "@/components/invoices/invoices-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invoices");
  return { title: t("meta.title") };
}

export default function InvoicesPage() {
  return (
    <ModuleGate module="invoices">
      <Suspense>
        <InvoicesView />
      </Suspense>
    </ModuleGate>
  );
}
