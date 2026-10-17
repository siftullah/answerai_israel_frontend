import type { Metadata } from "next";
import { Suspense } from "react";
import { CallLogsView } from "@/components/calls/call-logs-view";

export const metadata: Metadata = { title: "Inbound logs" };

export default function InboundLogsPage() {
  return (
    <Suspense>
      <CallLogsView direction="inbound" />
    </Suspense>
  );
}
