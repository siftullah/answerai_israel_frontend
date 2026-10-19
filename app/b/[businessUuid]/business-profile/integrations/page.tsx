import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { IntegrationsView } from "@/components/business-profile/integrations/integrations-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.integrations") };
}

export default function IntegrationsPage() {
  return <IntegrationsView />;
}
