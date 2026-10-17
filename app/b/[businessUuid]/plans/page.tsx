import type { Metadata } from "next";
import { PlansView } from "@/components/billing/plans-view";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return <PlansView />;
}
