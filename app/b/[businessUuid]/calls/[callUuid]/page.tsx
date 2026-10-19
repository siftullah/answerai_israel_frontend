import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CallResolver } from "@/components/calls/call-resolver";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calls");
  return { title: t("meta.call") };
}

export default function CallPage() {
  return <CallResolver />;
}
