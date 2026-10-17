import type { Metadata } from "next";
import { ServicesView } from "@/components/business-profile/services/services-view";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return <ServicesView />;
}
