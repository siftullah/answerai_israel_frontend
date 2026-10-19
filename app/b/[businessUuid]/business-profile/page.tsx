import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OverviewView } from "@/components/business-profile/overview/overview-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.overview") };
}

export default function BusinessProfileOverviewPage() {
  return <OverviewView />;
}
