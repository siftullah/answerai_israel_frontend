import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ModuleGate } from "@/components/business/module-gate";
import { CallbacksView } from "@/components/callbacks/callbacks-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("callbacks");
  return { title: t("meta.title") };
}

export default function CallbacksPage() {
  return (
    <ModuleGate module="callbacks">
      <Suspense>
        <CallbacksView />
      </Suspense>
    </ModuleGate>
  );
}
