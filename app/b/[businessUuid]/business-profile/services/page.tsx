import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ServicesView } from "@/components/business-profile/services/services-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.services") };
}

export default function ServicesPage() {
  return <ServicesView />;
}
