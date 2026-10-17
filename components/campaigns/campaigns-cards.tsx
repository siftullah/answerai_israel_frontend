"use client";

import Link from "next/link";
import { CampaignProgress } from "@/components/campaigns/campaign-progress";
import { CampaignRowActions } from "@/components/campaigns/campaign-row-actions";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import type { CampaignListProps } from "@/components/campaigns/campaigns-table";
import { formatDate } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

export function CampaignsCards({
  campaigns,
  businessUuid,
  timeZone,
  actions,
}: CampaignListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="relative flex flex-col gap-3 rounded-2xl border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                href={`/b/${businessUuid}/calls/campaigns/${campaign.id}`}
                className="truncate font-medium after:absolute after:inset-0 after:rounded-2xl"
              >
                {campaign.name}
              </Link>
              <div className="flex items-center gap-2">
                <CampaignStatusBadge status={campaign.status} />
              </div>
            </div>
            <div className="relative z-10">
              <CampaignRowActions
                campaign={campaign}
                businessUuid={businessUuid}
                actions={actions}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="truncate">{campaign.agent?.name ?? "No agent"}</span>
            <span className="truncate tabular-nums">
              {campaign.caller_number
                ? `From ${formatE164(campaign.caller_number.e164)}`
                : "No caller number"}
            </span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
            <CampaignProgress stats={campaign.stats} />
            <span className="shrink-0 text-sm text-muted-foreground">
              {formatDate(campaign.created_at, timeZone)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
