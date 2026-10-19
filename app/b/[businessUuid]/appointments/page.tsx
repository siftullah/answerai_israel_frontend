import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ModuleGate } from "@/components/business/module-gate";
import { AppointmentsView } from "@/components/appointments/appointments-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("appointments");
  return { title: t("meta.title") };
}

export default function AppointmentsPage() {
  return (
    <ModuleGate module="appointments">
      <Suspense>
        <AppointmentsView />
      </Suspense>
    </ModuleGate>
  );
}
