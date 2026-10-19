import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DncView } from "@/components/contacts/dnc/dnc-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacts");
  return { title: t("meta.dncTitle") };
}

export default function DncPage() {
  return <DncView />;
}
