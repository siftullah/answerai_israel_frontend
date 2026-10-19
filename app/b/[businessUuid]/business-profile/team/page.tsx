import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeamView } from "@/components/business-profile/team/team-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.team") };
}

export default function TeamPage() {
  return <TeamView />;
}
