import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PoliciesView } from "@/components/business-profile/policies/policies-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.policies") };
}

export default function PoliciesPage() {
  return <PoliciesView />;
}
