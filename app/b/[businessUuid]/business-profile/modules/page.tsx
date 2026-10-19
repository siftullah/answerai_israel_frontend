import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ModulesView } from "@/components/business-profile/modules/modules-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.modules") };
}

export default function ModulesPage() {
  return <ModulesView />;
}
