import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsView } from "@/components/business-profile/docs/docs-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.docs") };
}

export default function DocsPage() {
  return <DocsView />;
}
