import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FaqsView } from "@/components/business-profile/faqs/faqs-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.faqs") };
}

export default function FaqsPage() {
  return <FaqsView />;
}
