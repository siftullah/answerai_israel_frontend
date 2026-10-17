"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import { NumberStatusBadge } from "@/components/phone-numbers/number-status-badge";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import type { Agent } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";

export function NumbersSection({ agent }: { agent: Agent }) {
  const { business } = useBusiness();
  const numbersQuery = usePhoneNumbers(business.id);

  const numbers = (numbersQuery.data ?? []).filter(
    (number) =>
      number.inbound_agent?.id === agent.id || number.outbound_agent?.id === agent.id
  );

  return (
    <AgentSection
      id="numbers"
      title="Numbers"
      description="Phone numbers that route calls to or from this agent."
      actions={
        <Button size="sm" render={<Link href={`/b/${business.id}/phone-numbers`} />}>
          Manage phone numbers
          <ArrowUpRightIcon />
        </Button>
      }
    >
      {numbersQuery.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : numbers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No phone numbers use this agent yet — assign it on the phone numbers page.
        </p>
      ) : (
        <div className="flex flex-col divide-y">
          {numbers.map((number) => (
            <div key={number.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{formatE164(number.e164)}</p>
                {number.friendly_name && (
                  <p className="truncate text-sm text-muted-foreground">
                    {number.friendly_name}
                  </p>
                )}
              </div>
              {number.inbound_agent?.id === agent.id && (
                <Badge variant="secondary">Inbound</Badge>
              )}
              {number.outbound_agent?.id === agent.id && (
                <Badge variant="secondary">Outbound</Badge>
              )}
              <NumberStatusBadge status={number.status} />
            </div>
          ))}
        </div>
      )}
    </AgentSection>
  );
}
