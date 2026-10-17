import type { Metadata } from "next";
import { Suspense } from "react";
import { CallLogsView } from "@/components/calls/call-logs-view";

export const metadata: Metadata = { title: "Outbound logs" };

export default function OutboundLogsPage() {
  return (
    <Suspense>
      <CallLogsView direction="outbound" />
    </Suspense>
  );
}
