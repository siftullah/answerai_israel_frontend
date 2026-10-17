"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { toastRecipientsSummary } from "@/components/campaigns/detail/recipients/summary";
import type { ContactSelection } from "@/components/contacts/use-contact-selection";
import { useAddRecipientsFromContacts } from "@/hooks/use-campaign-recipients";
import { useCampaignsInfinite } from "@/hooks/use-campaigns";
import type { ContactListFilters, FromContactsPayload } from "@/lib/api/types";
import { TERMINAL_CAMPAIGN_STATUSES } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const MAX_EXPLICIT_IDS = 1000;

/** Sends the contact bulk selection into a campaign's recipient list. */
export function AddToCampaignDialog({
  selection,
  filters,
  open,
  onOpenChange,
  onDone,
}: {
  selection: ContactSelection;
  filters: ContactListFilters;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful add — the caller clears the selection. */
  onDone: () => void;
}) {
  const { business } = useBusiness();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const addFromContacts = useAddRecipientsFromContacts(business.id, campaignId ?? "");

  const campaignsQuery = useCampaignsInfinite(business.id, {});
  const campaigns = (campaignsQuery.data?.pages.flatMap((page) => page.data) ?? []).filter(
    (campaign) => !TERMINAL_CAMPAIGN_STATUSES.includes(campaign.status)
  );

  const allMatching = selection.mode === "all-matching";
  const explicitCount = selection.mode === "explicit" ? selection.ids.size : 0;
  const overIdCap = !allMatching && explicitCount > MAX_EXPLICIT_IDS;

  const submit = () => {
    if (campaignId === null) return;
    const payload: FromContactsPayload = allMatching
      ? {
          filters: {
            ...(filters.q !== undefined ? { q: filters.q } : {}),
            ...(filters.tag !== undefined ? { tag: filters.tag } : {}),
            ...(filters.source !== undefined ? { source: filters.source } : {}),
            ...(filters.has_name !== undefined ? { has_name: filters.has_name } : {}),
          },
        }
      : { ids: selection.mode === "explicit" ? [...selection.ids] : [] };

    addFromContacts.mutate(payload, {
      onSuccess: (summary) => {
        toastRecipientsSummary(summary);
        onDone();
      },
      onError: (error) =>
        toast.error(
          error.reason === "campaign_locked"
            ? "That campaign has finished — pick another one."
            : error.message
        ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to campaign</DialogTitle>
          <DialogDescription>
            {allMatching
              ? "Everything matching your filters joins the campaign's recipient list."
              : `${explicitCount} ${explicitCount === 1 ? "contact" : "contacts"} join the campaign's recipient list.`}{" "}
            Contacts without a phone are skipped; do-not-call numbers are blocked.
          </DialogDescription>
        </DialogHeader>

        {campaignsQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-4" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              No open campaigns — create one first, then add your audience.
            </p>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/b/${business.id}/calls/campaigns`} />}
            >
              Go to campaigns
            </Button>
          </div>
        ) : (
          <div className="flex max-h-72 flex-col overflow-y-auto rounded-xl border">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                aria-pressed={campaignId === campaign.id}
                onClick={() => setCampaignId(campaign.id)}
                className={cn(
                  "flex items-center justify-between gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/30",
                  campaignId === campaign.id && "bg-primary/5 ring-1 ring-primary/40 ring-inset"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {campaign.name}
                </span>
                <CampaignStatusBadge status={campaign.status} />
              </button>
            ))}
          </div>
        )}

        {overIdCap && (
          <p className="text-sm text-destructive">
            Up to {MAX_EXPLICIT_IDS} individually-picked contacts per batch — use
            &ldquo;Select everything matching&rdquo; with filters instead.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={campaignId === null || overIdCap || addFromContacts.isPending}
            onClick={submit}
          >
            {addFromContacts.isPending && <Spinner />}
            Add to campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
