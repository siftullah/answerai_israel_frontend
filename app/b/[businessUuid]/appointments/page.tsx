import type { Metadata } from "next";
import { Suspense } from "react";
import { ModuleGate } from "@/components/business/module-gate";
import { AppointmentsView } from "@/components/appointments/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default function AppointmentsPage() {
  return (
    <ModuleGate module="appointments">
      <Suspense>
        <AppointmentsView />
      </Suspense>
    </ModuleGate>
  );
}
