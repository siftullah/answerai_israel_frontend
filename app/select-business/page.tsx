import type { Metadata } from "next";
import { BusinessChooser } from "@/components/business/business-chooser";

export const metadata: Metadata = { title: "Choose a business" };

export default function SelectBusinessPage() {
  return <BusinessChooser />;
}
