"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AgentSection } from "@/components/agents/detail/agent-section";
import type { Agent } from "@/lib/api/types";

function DangerRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export function DangerSection({
  agent,
  onRotateToken,
  onArchiveToggle,
  archivePending,
  onDelete,
}: {
  agent: Agent;
  onRotateToken: () => void;
  onArchiveToggle: () => void;
  archivePending: boolean;
  onDelete: () => void;
}) {
  const t = useTranslations("agents.sections.danger");
  const ta = useTranslations("agents");
  const tc = useTranslations("common");
  const archived = agent.status === "archived";

  return (
    <AgentSection id="danger" title={t("title")} description={t("description")}>
      <div className="flex flex-col divide-y">
        <DangerRow
          title={ta("actions.rotateToolToken")}
          description={t("rotate.description")}
          action={
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={archived}
              onClick={onRotateToken}
            >
              {ta("actions.rotateToken")}
            </Button>
          }
        />
        <DangerRow
          title={archived ? t("restore.title") : t("archive.title")}
          description={archived ? t("restore.description") : t("archive.description")}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={archivePending}
              onClick={onArchiveToggle}
            >
              {archivePending && <Spinner />}
              {archived ? ta("actions.restore") : ta("actions.archive")}
            </Button>
          }
        />
        <DangerRow
          title={t("delete.title")}
          description={t("delete.description")}
          action={
            <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
              {tc("actions.delete")}
            </Button>
          }
        />
      </div>
    </AgentSection>
  );
}
