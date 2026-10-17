import type { Metadata } from "next";
import { OverviewView } from "@/components/business-profile/overview/overview-view";

export const metadata: Metadata = { title: "Business profile" };

export default function BusinessProfileOverviewPage() {
  return <OverviewView />;
}
