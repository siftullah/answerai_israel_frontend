import type { Metadata } from "next";
import { Suspense } from "react";
import { CampaignDetailView } from "@/components/campaigns/detail/campaign-detail-view";

export const metadata: Metadata = { title: "Campaign" };

export default function CampaignDetailPage() {
  return (
    <Suspense>
      <CampaignDetailView />
    </Suspense>
  );
}
