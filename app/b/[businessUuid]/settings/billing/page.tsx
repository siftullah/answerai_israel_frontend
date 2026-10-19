import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BillingView } from "@/components/settings/billing/billing-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("billing.meta.title") };
}

export default function BillingPage() {
  return <BillingView />;
}
