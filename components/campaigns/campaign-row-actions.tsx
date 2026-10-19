"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BanIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Campaign } from "@/lib/api/types";

export interface CampaignActionHandlers {
  onStart: (campaign: Campaign) => void;
  onPause: (campaign: Campaign) => void;
  onResume: (campaign: Campaign) => void;
  onCancel: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}

/** Kebab shared by the table row and the card — items follow the lifecycle. */
export function CampaignRowActions({
  campaign,
  businessUuid,
  actions,
}: {
  campaign: Campaign;
  businessUuid: string;
  actions: CampaignActionHandlers;
}) {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const { status } = campaign;
  const canStart = status === "draft" || status === "scheduled";
  const canCancel = status === "scheduled" || status === "running" || status === "paused";
  // Active campaigns must be canceled first — a raw delete would strand
  // queued calls, which only cancel knows how to unwind.
  const canDelete = status === "draft" || status === "completed" || status === "canceled";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("a11y.actionsFor", { name: campaign.name })}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/b/${businessUuid}/calls/campaigns/${campaign.id}`} />}
        >
          <EyeIcon />
          {tc("actions.open")}
        </DropdownMenuItem>
        {canStart && (
          <DropdownMenuItem onClick={() => actions.onStart(campaign)}>
            <PlayIcon />
            {status === "scheduled" ? t("actions.startNow") : t("actions.start")}
          </DropdownMenuItem>
        )}
        {status === "running" && (
          <DropdownMenuItem onClick={() => actions.onPause(campaign)}>
            <PauseIcon />
            {t("actions.pause")}
          </DropdownMenuItem>
        )}
        {status === "paused" && (
          <DropdownMenuItem onClick={() => actions.onResume(campaign)}>
            <PlayIcon />
            {t("actions.resume")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => actions.onDuplicate(campaign)}>
          <CopyIcon />
          {t("actions.duplicate")}
        </DropdownMenuItem>
        {canCancel && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.onCancel(campaign)}>
            <BanIcon />
            {t("actions.cancelCampaign")}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(campaign)}>
            <Trash2Icon />
            {tc("actions.delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
