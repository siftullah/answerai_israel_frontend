import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BasicInfoView } from "@/components/business-profile/basic-info/basic-info-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.basicInfo") };
}

export default function BasicInfoPage() {
  return <BasicInfoView />;
}
