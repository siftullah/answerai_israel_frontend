import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TransfersView } from "@/components/business-profile/transfers/transfers-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.transfers") };
}

export default function TransfersPage() {
  return <TransfersView />;
}
