import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CallLogsView } from "@/components/calls/call-logs-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calls");
  return { title: t("meta.inboundLogs") };
}

export default function InboundLogsPage() {
  return (
    <Suspense>
      <CallLogsView direction="inbound" />
    </Suspense>
  );
}
