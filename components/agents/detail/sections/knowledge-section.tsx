"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import {
  ArrowUpRightIcon,
  BriefcaseIcon,
  FilesIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  ScrollTextIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/components/business/business-provider";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { useBusinessPolicies } from "@/hooks/use-business-policies";
import { useDocuments } from "@/hooks/use-documents";
import { useFaqs } from "@/hooks/use-faqs";
import { useProducts } from "@/hooks/use-products";
import { useServices } from "@/hooks/use-services";
import type { Agent, AgentScope } from "@/lib/api/types";
import type { AgentSettingsValues } from "@/lib/validation/agent";
import { cn } from "@/lib/utils";

interface Scoped {
  agent_scope: AgentScope;
  agent_ids?: string[];
}

function enabledCount(items: Scoped[] | undefined, agentId: string): number {
  return (items ?? []).filter(
    (item) => item.agent_scope === "all" || (item.agent_ids ?? []).includes(agentId)
  ).length;
}

export function KnowledgeSection({ agent }: { agent: Agent }) {
  const t = useTranslations("agents.sections.knowledge");
  const { business } = useBusiness();
  const form = useFormContext<AgentSettingsValues>();
  const { disabled } = form.formState;
  const ragEnabled = form.watch("rag_enabled");

  const documents = useDocuments(business.id);
  const faqs = useFaqs(business.id);
  const services = useServices(business.id);
  const products = useProducts(business.id);
  const policies = useBusinessPolicies(business.id);

  const rows = [
    { title: t("rows.docs"), icon: FilesIcon, segment: "docs", query: documents },
    { title: t("rows.faqs"), icon: MessageCircleQuestionIcon, segment: "faqs", query: faqs },
    { title: t("rows.services"), icon: BriefcaseIcon, segment: "services", query: services },
    { title: t("rows.products"), icon: PackageIcon, segment: "products", query: products },
    { title: t("rows.policies"), icon: ScrollTextIcon, segment: "policies", query: policies },
  ] as const;

  return (
    <AgentSection id="knowledge" title={t("title")} description={t("description")}>
      <Field>
        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="rag_enabled"
            render={({ field }) => (
              <Switch
                id="agent-rag"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
          <FieldLabel htmlFor="agent-rag" className="font-normal">
            {t("useKnowledgeBase")}
          </FieldLabel>
        </div>
        <FieldDescription>{t("ragHint")}</FieldDescription>
      </Field>

      <div className={cn("flex flex-col divide-y", !ragEnabled && "opacity-60")}>
        {rows.map((row) => {
          const total = row.query.data?.length;
          const enabled = enabledCount(row.query.data, agent.id);
          return (
            <div key={row.segment} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <row.icon className="size-4 shrink-0 text-muted-foreground" />
              <p className="flex-1 text-sm font-medium">{row.title}</p>
              {row.query.isPending ? (
                <Skeleton className="h-4 w-24" />
              ) : row.query.isError ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("enabledCount", { enabled, total: total ?? 0 })}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-cta hover:text-cta"
                render={<Link href={`/b/${business.id}/business-profile/${row.segment}`} />}
              >
                {t("manage")}
                <ArrowUpRightIcon className="rtl:-scale-x-100" />
              </Button>
            </div>
          );
        })}
      </div>
    </AgentSection>
  );
}
