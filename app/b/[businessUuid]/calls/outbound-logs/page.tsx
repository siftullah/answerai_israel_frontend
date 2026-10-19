import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CallLogsView } from "@/components/calls/call-logs-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calls");
  return { title: t("meta.outboundLogs") };
}

export default function OutboundLogsPage() {
  return (
    <Suspense>
      <CallLogsView direction="outbound" />
    </Suspense>
  );
}
