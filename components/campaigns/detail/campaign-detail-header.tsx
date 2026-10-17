"use client";

import {
  BanIcon,
  CopyIcon,
  EllipsisVerticalIcon,
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
import { Spinner } from "@/components/ui/spinner";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import type { Campaign } from "@/lib/api/types";
import { formatDateTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

export function CampaignDetailHeader({
  campaign,
  timeZone,
  busy,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDuplicate,
  onDelete,
}: {
  campaign: Campaign;
  timeZone: string;
  /** A lifecycle mutation is in flight — freeze the action buttons. */
  busy: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { status } = campaign;
  const canStart = status === "draft" || status === "scheduled";
  const canCancel = status === "scheduled" || status === "running" || status === "paused";
  const canDelete = status === "draft" || status === "completed" || status === "canceled";

  const subline = [
    campaign.agent?.name,
    campaign.caller_number ? `from ${formatE164(campaign.caller_number.e164)}` : null,
    campaign.start_at && status === "scheduled"
      ? `starts ${formatDateTime(campaign.start_at, timeZone)}`
      : null,
    campaign.completed_at && status === "completed"
      ? `finished ${formatDateTime(campaign.completed_at, timeZone)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-2xl font-semibold">{campaign.name}</h2>
          <CampaignStatusBadge status={status} />
        </div>
        {subline && <p className="text-sm text-muted-foreground">{subline}</p>}
      </div>

      <div className="flex items-center gap-2">
        {canStart && (
          <Button onClick={onStart} disabled={busy}>
            {busy ? <Spinner /> : <PlayIcon />}
            {status === "scheduled" ? "Start now" : "Start"}
          </Button>
        )}
        {status === "running" && (
          <Button variant="cta" onClick={onPause} disabled={busy}>
            {busy ? <Spinner /> : <PauseIcon />}
            Pause
          </Button>
        )}
        {status === "paused" && (
          <Button variant="cta" onClick={onResume} disabled={busy}>
            {busy ? <Spinner /> : <PlayIcon />}
            Resume
          </Button>
        )}
        {canCancel && (
          <Button variant="destructive" onClick={onCancel} disabled={busy}>
            <BanIcon />
            Cancel
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="More campaign actions" />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>
              <CopyIcon />
              Duplicate
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
