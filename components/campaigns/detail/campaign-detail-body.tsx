"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBusiness } from "@/components/business/business-provider";
import { CampaignDetailHeader } from "@/components/campaigns/detail/campaign-detail-header";
import { CampaignStatsStrip } from "@/components/campaigns/detail/campaign-stats-strip";
import { CampaignTabs, type CampaignTab } from "@/components/campaigns/detail/campaign-tabs";
import { CampaignCallsTab } from "@/components/campaigns/detail/calls/campaign-calls-tab";
import { RecipientsTab } from "@/components/campaigns/detail/recipients/recipients-tab";
import { CampaignSettingsTab } from "@/components/campaigns/detail/settings/campaign-settings-tab";
import { campaignActionErrorMessage } from "@/components/campaigns/start-error";
import {
  useCancelCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useStartCampaign,
} from "@/hooks/use-campaigns";
import type { Campaign } from "@/lib/api/types";

export function CampaignDetailBody({ campaign }: { campaign: Campaign }) {
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: CampaignTab =
    tabParam === "calls" || tabParam === "settings" ? tabParam : "recipients";

  const setTab = (next: CampaignTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === "recipients") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const startCampaign = useStartCampaign(business.id);
  const pauseCampaign = usePauseCampaign(business.id);
  const resumeCampaign = useResumeCampaign(business.id);
  const cancelCampaign = useCancelCampaign(business.id);
  const duplicateCampaign = useDuplicateCampaign(business.id);
  const deleteCampaign = useDeleteCampaign(business.id);

  const busy =
    startCampaign.isPending ||
    pauseCampaign.isPending ||
    resumeCampaign.isPending ||
    cancelCampaign.isPending;

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <CampaignDetailHeader
        campaign={campaign}
        timeZone={business.timezone}
        busy={busy}
        onStart={() =>
          startCampaign.mutate(campaign.id, {
            onSuccess: (started) =>
              toast.success(
                started.status === "scheduled"
                  ? "Campaign scheduled — dialing begins at the start time"
                  : "Campaign started"
              ),
            onError: (error) => {
              const message = campaignActionErrorMessage(error);
              if (error.reason === "campaign_no_recipients") {
                toast.error(message, {
                  description: "Add numbers, pick contacts, or import a spreadsheet below.",
                });
              } else {
                toast.error(message);
              }
            },
          })
        }
        onPause={() =>
          pauseCampaign.mutate(campaign.id, {
            onSuccess: () => toast.success("Campaign paused"),
            onError: (error) => toast.error(campaignActionErrorMessage(error)),
          })
        }
        onResume={() =>
          resumeCampaign.mutate(campaign.id, {
            onSuccess: () => toast.success("Campaign resumed"),
            onError: (error) => toast.error(campaignActionErrorMessage(error)),
          })
        }
        onCancel={() => setConfirmingCancel(true)}
        onDuplicate={() =>
          duplicateCampaign.mutate(campaign.id, {
            onSuccess: (copy) => {
              toast.success("Campaign duplicated as a draft");
              router.push(`/b/${business.id}/calls/campaigns/${copy.id}`);
            },
            onError: (error) => toast.error(error.message),
          })
        }
        onDelete={() => setConfirmingDelete(true)}
      />

      <CampaignStatsStrip stats={campaign.stats} />

      <CampaignTabs
        tab={tab}
        onTabChange={setTab}
        stats={campaign.stats}
        recipients={<RecipientsTab campaign={campaign} onGoToSettings={() => setTab("settings")} />}
        calls={<CampaignCallsTab campaign={campaign} />}
        settings={<CampaignSettingsTab campaign={campaign} />}
      />

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {campaign.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Canceling stops dialing and cancels every queued call and remaining
              recipient. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancelCampaign.mutate(campaign.id, {
                  onSuccess: () => toast.success("Campaign canceled"),
                  onError: (error) => toast.error(campaignActionErrorMessage(error)),
                });
                setConfirmingCancel(false);
              }}
            >
              Cancel campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {campaign.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the campaign and its recipient list. Calls it already made stay
              in your call logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteCampaign.mutate(campaign.id, {
                  onSuccess: () => {
                    toast.success("Campaign deleted");
                    router.push(`/b/${business.id}/calls/campaigns`);
                  },
                  onError: (error) => toast.error(error.message),
                });
                setConfirmingDelete(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
