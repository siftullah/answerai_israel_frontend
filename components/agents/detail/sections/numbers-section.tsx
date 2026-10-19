"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("agents.sections.numbers");
  const ta = useTranslations("agents");
  const { business } = useBusiness();
  const numbersQuery = usePhoneNumbers(business.id);

  const numbers = (numbersQuery.data ?? []).filter(
    (number) =>
      number.inbound_agent?.id === agent.id || number.outbound_agent?.id === agent.id
  );

  return (
    <AgentSection
      id="numbers"
      title={t("title")}
      description={t("description")}
      actions={
        <Button size="sm" render={<Link href={`/b/${business.id}/phone-numbers`} />}>
          {t("manage")}
          <ArrowUpRightIcon className="rtl:-scale-x-100" />
        </Button>
      }
    >
      {numbersQuery.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : numbers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
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
                <Badge variant="secondary">{ta("purpose.inbound.label")}</Badge>
              )}
              {number.outbound_agent?.id === agent.id && (
                <Badge variant="secondary">{ta("purpose.outbound.label")}</Badge>
              )}
              <NumberStatusBadge status={number.status} />
            </div>
          ))}
        </div>
      )}
    </AgentSection>
  );
}
