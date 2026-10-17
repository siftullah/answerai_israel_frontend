"use client";

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
  const archived = agent.status === "archived";

  return (
    <AgentSection
      id="danger"
      title="Danger zone"
      description="Actions that affect this agent's live behaviour."
    >
      <div className="flex flex-col divide-y">
        <DangerRow
          title="Rotate tool token"
          description="The tool token authenticates this agent's live actions — bookings, contact lookups — against your account. Rotating invalidates the old token instantly; the voice engine receives the new one automatically."
          action={
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={archived}
              onClick={onRotateToken}
            >
              Rotate token
            </Button>
          }
        />
        <DangerRow
          title={archived ? "Restore agent" : "Archive agent"}
          description={
            archived
              ? "Make the agent active again so it can take calls and be edited."
              : "Deactivates the agent and hides it from pickers. Nothing is deleted — restore it any time."
          }
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={archivePending}
              onClick={onArchiveToggle}
            >
              {archivePending && <Spinner />}
              {archived ? "Restore" : "Archive"}
            </Button>
          }
        />
        <DangerRow
          title="Delete agent"
          description="Permanently deletes the agent and unpublishes it from the voice engine. Phone numbers that route here are left unassigned."
          action={
            <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          }
        />
      </div>
    </AgentSection>
  );
}
