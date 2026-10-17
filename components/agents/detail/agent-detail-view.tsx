"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { AgentDetailBody } from "@/components/agents/detail/agent-detail-body";
import { useAgent } from "@/hooks/use-agents";

/** Route-level wrapper: resolves the agent, then remounts the body per agent. */
export function AgentDetailView() {
  const { agentUuid } = useParams<{ businessUuid: string; agentUuid: string }>();
  const { business } = useBusiness();
  const agentQuery = useAgent(business.id, agentUuid);

  if (agentQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (agentQuery.isError) {
    const notFound = agentQuery.error.status === 404;
    return (
      <div className="flex flex-col items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/b/${business.id}/agents`} />}
        >
          <ArrowLeftIcon />
          Agents
        </Button>
        <ErrorState
          title={notFound ? "Agent not found" : "Couldn't load this agent"}
          message={
            notFound
              ? "This agent doesn't exist or was deleted."
              : agentQuery.error.message
          }
          onRetry={notFound ? undefined : () => agentQuery.refetch()}
        />
      </div>
    );
  }

  return <AgentDetailBody key={agentQuery.data.id} agent={agentQuery.data} />;
}
