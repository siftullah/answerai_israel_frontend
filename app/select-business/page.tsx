import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BusinessChooser } from "@/components/business/business-chooser";

export async function generateMetadata(): Promise<Metadata> {
  const tc = await getTranslations("common");
  return { title: tc("actions.chooseBusiness") };
}

export default function SelectBusinessPage() {
  return <BusinessChooser />;
}
