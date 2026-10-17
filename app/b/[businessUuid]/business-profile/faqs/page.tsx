import type { Metadata } from "next";
import { FaqsView } from "@/components/business-profile/faqs/faqs-view";

export const metadata: Metadata = { title: "FAQs" };

export default function FaqsPage() {
  return <FaqsView />;
}
