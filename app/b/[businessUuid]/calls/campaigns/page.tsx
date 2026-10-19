import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CampaignsView } from "@/components/campaigns/campaigns-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("campaigns");
  return { title: t("meta.title") };
}

export default function CampaignsPage() {
  return <CampaignsView />;
}
