"use client";

import Link from "next/link";
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
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${campaign.name}`} />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/b/${businessUuid}/calls/campaigns/${campaign.id}`} />}
        >
          <EyeIcon />
          Open
        </DropdownMenuItem>
        {canStart && (
          <DropdownMenuItem onClick={() => actions.onStart(campaign)}>
            <PlayIcon />
            {status === "scheduled" ? "Start now" : "Start"}
          </DropdownMenuItem>
        )}
        {status === "running" && (
          <DropdownMenuItem onClick={() => actions.onPause(campaign)}>
            <PauseIcon />
            Pause
          </DropdownMenuItem>
        )}
        {status === "paused" && (
          <DropdownMenuItem onClick={() => actions.onResume(campaign)}>
            <PlayIcon />
            Resume
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => actions.onDuplicate(campaign)}>
          <CopyIcon />
          Duplicate
        </DropdownMenuItem>
        {canCancel && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.onCancel(campaign)}>
            <BanIcon />
            Cancel campaign
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(campaign)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
