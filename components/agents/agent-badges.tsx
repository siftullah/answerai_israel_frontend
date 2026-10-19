"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AgentPurpose, AgentSyncStatus } from "@/lib/api/types";

export function AgentPurposeBadge({ purpose }: { purpose: AgentPurpose }) {
  const t = useTranslations("agents.purpose");
  if (purpose === "consult") return null;
  if (purpose === "inbound") return <Badge variant="info">{t("inbound.label")}</Badge>;
  // Violet — far enough from the info blue that the pair reads at a glance.
  return (
    <Badge className="bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
      {t("outbound.label")}
    </Badge>
  );
}

/** Publish state against the voice engine, per number-status-badge conventions. */
export function AgentSyncBadge({
  status,
  error,
}: {
  status: AgentSyncStatus;
  error?: string | null;
}) {
  const t = useTranslations("agents.badges.sync");
  if (status === "in_sync") return <Badge variant="success">{t("inSync")}</Badge>;
  if (status === "error") {
    return (
      <Tooltip>
        <TooltipTrigger render={<Badge variant="destructive" className="cursor-default" />}>
          {t("error")}
        </TooltipTrigger>
        <TooltipContent className="max-w-72">
          {t("errorTooltip", { error: error ?? t("errorFallback") })}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Badge variant="info" className="gap-1.5">
      <Spinner className="size-3" />
      {status === "syncing" ? t("syncing") : t("publishing")}
    </Badge>
  );
}
