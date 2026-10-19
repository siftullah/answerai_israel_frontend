"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

const STATUS_OPTIONS: StatusFilter[] = ["all", ...CAMPAIGN_STATUSES];

/** Segmented pill group (agents StatusFilter recipe). */
function StatusFilterGroup({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  return (
    <div
      role="group"
      aria-label={t("filters.byStatus")}
      className="flex shrink-0 flex-wrap items-center gap-0.5 rounded-full bg-muted p-1"
    >
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === option
              ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option === "all" ? tc("labels.all") : t(`status.${option}`)}
        </button>
      ))}
    </div>
  );
}

export function CampaignsView() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
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
            started.status === "scheduled" ? t("toasts.scheduled") : t("toasts.started")
          ),
        onError: (error) => toast.error(campaignActionErrorMessage(error)),
      }),
    onPause: (campaign) =>
      pauseCampaign.mutate(campaign.id, {
        onSuccess: () => toast.success(t("toasts.paused")),
        onError: (error) => toast.error(campaignActionErrorMessage(error)),
      }),
    onResume: (campaign) =>
      resumeCampaign.mutate(campaign.id, {
        onSuccess: () => toast.success(t("toasts.resumed")),
        onError: (error) => toast.error(campaignActionErrorMessage(error)),
      }),
    onCancel: (campaign) => setCanceling(campaign),
    onDuplicate: (campaign) =>
      duplicateCampaign.mutate(campaign.id, {
        onSuccess: (copy) => {
          toast.success(t("toasts.duplicated"));
          router.push(`/b/${business.id}/calls/campaigns/${copy.id}`);
        },
        onError: (error) => toast.error(error.message),
      }),
    onDelete: (campaign) => setDeleting(campaign),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            {t("list.newCampaign")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("list.searchPlaceholder")}
          className="w-full sm:w-72"
          autoComplete="off"
        />
        <StatusFilterGroup value={status} onChange={setStatus} />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ms-auto" />
      </div>

      {campaignsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : campaignsQuery.isError ? (
        <ErrorState
          title={t("list.loadError")}
          message={campaignsQuery.error.message}
          onRetry={() => campaignsQuery.refetch()}
        />
      ) : campaigns.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("list.noMatches")}
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("list.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("list.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {t("list.newCampaign")}
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
            <AlertDialogTitle>
              {t("cancelDialog.title", { name: canceling?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("cancelDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDialog.keepRunning")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!canceling) return;
                cancelCampaign.mutate(canceling.id, {
                  onSuccess: () => toast.success(t("toasts.canceled")),
                  onError: (error) => toast.error(campaignActionErrorMessage(error)),
                });
                setCanceling(null);
              }}
            >
              {t("actions.cancelCampaign")}
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
            <AlertDialogTitle>
              {t("deleteDialog.title", { name: deleting?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteCampaign.mutate(deleting.id, {
                  onSuccess: () => toast.success(t("toasts.deleted")),
                  onError: (error) => toast.error(error.message),
                });
                setDeleting(null);
              }}
            >
              {tc("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
