import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgentsView } from "@/components/agents/agents-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("agents");
  return { title: t("meta.title") };
}

export default function AgentsPage() {
  return <AgentsView />;
}
