"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { CampaignProgress } from "@/components/campaigns/campaign-progress";
import {
  CampaignRowActions,
  type CampaignActionHandlers,
} from "@/components/campaigns/campaign-row-actions";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import type { Campaign } from "@/lib/api/types";
import { formatDate } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

export interface CampaignListProps {
  campaigns: Campaign[];
  businessUuid: string;
  timeZone: string;
  actions: CampaignActionHandlers;
}

export function CampaignsTable({
  campaigns,
  businessUuid,
  timeZone,
  actions,
}: CampaignListProps) {
  const t = useTranslations("campaigns.table");
  const tc = useTranslations("common");
  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tc("labels.name")}</TableHead>
            <TableHead>{tc("labels.status")}</TableHead>
            <TableHead>{t("agent")}</TableHead>
            <TableHead>{t("callerNumber")}</TableHead>
            <TableHead>{t("progress")}</TableHead>
            <TableHead>{t("created")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <Link
                  href={`/b/${businessUuid}/calls/campaigns/${campaign.id}`}
                  className="block max-w-64 truncate font-medium hover:underline"
                >
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell>
                <CampaignStatusBadge status={campaign.status} />
              </TableCell>
              <TableCell>
                <span className="block max-w-48 truncate">
                  {campaign.agent?.name ?? <span className="text-muted-foreground">—</span>}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {campaign.caller_number ? (
                  formatE164(campaign.caller_number.e164)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <CampaignProgress stats={campaign.stats} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(campaign.created_at, timeZone)}
              </TableCell>
              <TableCell>
                <CampaignRowActions
                  campaign={campaign}
                  businessUuid={businessUuid}
                  actions={actions}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
