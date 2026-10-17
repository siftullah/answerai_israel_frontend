"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { useBusiness } from "@/components/business/business-provider";
import { selectableAgents, useAgents } from "@/hooks/use-agents";
import type { AgentPurpose, AgentScope } from "@/lib/api/types";

const PURPOSE_LABELS: Record<AgentPurpose, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  consult: "Consult",
};

const SCOPE_OPTIONS = [
  {
    value: "all",
    label: "All agents",
    description: "Current and future agents can use this.",
  },
  {
    value: "selected",
    label: "Selected agents",
    description: "Pick exactly which agents get it.",
  },
] as const;

/**
 * The universal per-agent enablement control (agent_scope + agent_ids).
 * Registers the API's exact field names via form context — every
 * knowledge form (service, product, FAQ, policy, doc) renders this as-is.
 */
export function AgentScopeField({ idPrefix }: { idPrefix: string }) {
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const agents = selectableAgents(agentsQuery.data);

  const form = useFormContext();
  const scope = useWatch({ name: "agent_scope" }) as AgentScope;
  const ids = (useWatch({ name: "agent_ids" }) ?? []) as string[];

  const error = (form.formState.errors.agent_ids as { message?: string } | undefined)?.message;

  const toggle = (agentId: string) => {
    const next = ids.includes(agentId)
      ? ids.filter((id) => id !== agentId)
      : [...ids, agentId];
    form.setValue("agent_ids", next, {
      shouldDirty: true,
      shouldValidate: form.formState.submitCount > 0,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-base font-medium">Agent access</p>
        <p className="text-sm text-muted-foreground">Which AI agents can use this.</p>
      </div>

      <Controller
        control={form.control}
        name="agent_scope"
        render={({ field }) => (
          <ChoiceCards
            value={field.value as AgentScope}
            onChange={field.onChange}
            options={SCOPE_OPTIONS}
          />
        )}
      />

      {scope === "selected" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col rounded-2xl border">
            {agentsQuery.isSuccess && agents.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No agents yet — create an agent first, then pick it here.
              </p>
            ) : (
              agents.map((agent, index) => (
                <label
                  key={agent.id}
                  htmlFor={`${idPrefix}-agent-${agent.id}`}
                  className={
                    "flex cursor-pointer items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40" +
                    (index > 0 ? " border-t" : "")
                  }
                >
                  <Checkbox
                    id={`${idPrefix}-agent-${agent.id}`}
                    checked={ids.includes(agent.id)}
                    onCheckedChange={() => toggle(agent.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{agent.name}</span>
                  <Badge variant="secondary">{PURPOSE_LABELS[agent.purpose]}</Badge>
                </label>
              ))
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
