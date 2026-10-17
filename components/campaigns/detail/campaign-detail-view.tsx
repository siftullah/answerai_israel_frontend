"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { CampaignDetailBody } from "@/components/campaigns/detail/campaign-detail-body";
import { useCampaign } from "@/hooks/use-campaigns";

/** Route-level wrapper: resolves the campaign, then remounts the body per campaign. */
export function CampaignDetailView() {
  const { campaignUuid } = useParams<{ businessUuid: string; campaignUuid: string }>();
  const { business } = useBusiness();
  const campaignQuery = useCampaign(business.id, campaignUuid);

  if (campaignQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (campaignQuery.isError) {
    const notFound = campaignQuery.error.status === 404;
    return (
      <div className="flex flex-col items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/b/${business.id}/calls/campaigns`} />}
        >
          <ArrowLeftIcon />
          Campaigns
        </Button>
        <ErrorState
          title={notFound ? "Campaign not found" : "Couldn't load this campaign"}
          message={
            notFound
              ? "This campaign doesn't exist or was deleted."
              : campaignQuery.error.message
          }
          onRetry={notFound ? undefined : () => campaignQuery.refetch()}
        />
      </div>
    );
  }

  return <CampaignDetailBody key={campaignQuery.data.id} campaign={campaignQuery.data} />;
}
