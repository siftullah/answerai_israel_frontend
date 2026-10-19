import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgentDetailView } from "@/components/agents/detail/agent-detail-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("agents");
  return { title: t("meta.agentTitle") };
}

export default function AgentDetailPage() {
  return <AgentDetailView />;
}
