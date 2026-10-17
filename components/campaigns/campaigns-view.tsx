"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import type { CampaignActionHandlers } from "@/components/campaigns/campaign-row-actions";
import { CampaignsCards } from "@/components/campaigns/campaigns-cards";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { CreateCampaignModal } from "@/components/campaigns/create-campaign-modal";
import { campaignActionErrorMessage } from "@/components/campaigns/start-error";
import {
  useCampaignsInfinite,
  useCancelCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useStartCampaign,
} from "@/hooks/use-campaigns";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useViewMode } from "@/hooks/use-view-mode";
import type { Campaign, CampaignListFilters, CampaignStatus } from "@/lib/api/types";
import { CAMPAIGN_STATUSES } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | CampaignStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

/** Segmented pill group (agents StatusFilter recipe). */
function StatusFilterGroup({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="flex shrink-0 flex-wrap items-center gap-0.5 rounded-full bg-muted p-1"
    >
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === option.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CampaignsView() {
  const { business } = useBusiness();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = useState<StatusFilter>("all");

  // Conditional spreads so empty filters never appear as query-key segments.
  const apiFilters = useMemo<CampaignListFilters>(
    () => ({
      ...(debouncedSearch !== "" ? { q: debouncedSearch } : {}),
      ...(status !== "all" ? { status } : {}),
    }),
    [debouncedSearch, status]
  );
  const hasFilters = Object.keys(apiFilters).length > 0;

  const campaignsQuery = useCampaignsInfinite(business.id, apiFilters);

  const startCampaign = useStartCampaign(business.id);
  const pauseCampaign = usePauseCampaign(business.id);
  const resumeCampaign = useResumeCampaign(business.id);
  const cancelCampaign = useCancelCampaign(business.id);
  const duplicateCampaign = useDuplicateCampaign(business.id);
  const deleteCampaign = useDeleteCampaign(business.id);

  const [viewMode, setViewMode] = useViewMode("campaigns");
  const [createOpen, setCreateOpen] = useState(false);
  const [canceling, setCanceling] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = campaignsQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const campaigns = campaignsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  const actions: CampaignActionHandlers = {
    onStart: (campaign) =>
      startCampaign.mutate(campaign.id, {
        onSuccess: (started) =>
          toast.success(
            started.status === "scheduled"
              ? "Campaign scheduled — dialing begins at the start time"
              : "Campaign started"
          ),
        onError: (error) => toast.error(campaignActionErrorMessage(error)),
      }),
    onPause: (campaign) =>
      pauseCampaign.mutate(campaign.id, {
        onSuccess: () => toast.success("Campaign paused"),
        onError: (error) => toast.error(campaignActionErrorMessage(error)),
      }),
    onResume: (campaign) =>
      resumeCampaign.mutate(campaign.id, {
        onSuccess: () => toast.success("Campaign resumed"),
        onError: (error) => toast.error(campaignActionErrorMessage(error)),
      }),
    onCancel: (campaign) => setCanceling(campaign),
    onDuplicate: (campaign) =>
      duplicateCampaign.mutate(campaign.id, {
        onSuccess: (copy) => {
          toast.success("Campaign duplicated as a draft");
          router.push(`/b/${business.id}/calls/campaigns/${copy.id}`);
        },
        onError: (error) => toast.error(error.message),
      }),
    onDelete: (campaign) => setDeleting(campaign),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Bulk outbound calling — your AI works through a list, retries the misses, and skips the do-not-call register."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            New campaign
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search campaigns"
          className="w-full sm:w-72"
          autoComplete="off"
        />
        <StatusFilterGroup value={status} onChange={setStatus} />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ml-auto" />
      </div>

      {campaignsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : campaignsQuery.isError ? (
        <ErrorState
          title="Couldn't load campaigns"
          message={campaignsQuery.error.message}
          onRetry={() => campaignsQuery.refetch()}
        />
      ) : campaigns.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No campaigns match your filters.
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>No campaigns yet</EmptyTitle>
              <EmptyDescription>
                Create one, load your list of numbers or contacts, and your outbound agent
                does the calling.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New campaign
            </Button>
          </Empty>
        )
      ) : (
        <>
          {viewMode === "cards" ? (
            <CampaignsCards
              campaigns={campaigns}
              businessUuid={business.id}
              timeZone={business.timezone}
              actions={actions}
            />
          ) : (
            <CampaignsTable
              campaigns={campaigns}
              businessUuid={business.id}
              timeZone={business.timezone}
              actions={actions}
            />
          )}
          {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Spinner className="size-4" />
            </div>
          )}
        </>
      )}

      {createOpen && (
        <CreateCampaignModal
          open
          onOpenChange={(next) => {
            if (!next) setCreateOpen(false);
          }}
        />
      )}

      <AlertDialog
        open={canceling !== null}
        onOpenChange={(next) => {
          if (!next) setCanceling(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {canceling?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Canceling stops dialing and cancels every queued call and remaining
              recipient. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!canceling) return;
                cancelCampaign.mutate(canceling.id, {
                  onSuccess: () => toast.success("Campaign canceled"),
                  onError: (error) => toast.error(campaignActionErrorMessage(error)),
                });
                setCanceling(null);
              }}
            >
              Cancel campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the campaign and its recipient list. Calls it already made stay
              in your call logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteCampaign.mutate(deleting.id, {
                  onSuccess: () => toast.success("Campaign deleted"),
                  onError: (error) => toast.error(error.message),
                });
                setDeleting(null);
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
