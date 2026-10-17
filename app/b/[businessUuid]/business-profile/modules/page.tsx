import type { Metadata } from "next";
import { ModulesView } from "@/components/business-profile/modules/modules-view";

export const metadata: Metadata = { title: "Modules" };

export default function ModulesPage() {
  return <ModulesView />;
}
