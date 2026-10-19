import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CampaignDetailView } from "@/components/campaigns/detail/campaign-detail-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("campaigns");
  return { title: t("meta.detailTitle") };
}

export default function CampaignDetailPage() {
  return (
    <Suspense>
      <CampaignDetailView />
    </Suspense>
  );
}
