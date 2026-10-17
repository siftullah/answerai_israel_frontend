import type { Metadata } from "next";
import { BasicInfoView } from "@/components/business-profile/basic-info/basic-info-view";

export const metadata: Metadata = { title: "Basic info" };

export default function BasicInfoPage() {
  return <BasicInfoView />;
}
