import type { Metadata } from "next";
import { AgentDetailView } from "@/components/agents/detail/agent-detail-view";

export const metadata: Metadata = { title: "Agent" };

export default function AgentDetailPage() {
  return <AgentDetailView />;
}
