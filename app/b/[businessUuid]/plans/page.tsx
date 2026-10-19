import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlansView } from "@/components/billing/plans-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("meta.title") };
}

export default function PlansPage() {
  return <PlansView />;
}
