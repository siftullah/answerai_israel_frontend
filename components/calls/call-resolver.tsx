"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { FullPageLoader } from "@/components/full-page-loader";
import { useBusiness } from "@/components/business/business-provider";
import { useCall } from "@/hooks/use-calls";

/**
 * Canonical deep-link target: /b/{business}/calls/{uuid} looks the call up
 * and lands on the right log page with it selected. Also the only route into
 * consult-leg details, which never appear in the lists.
 */
export function CallResolver() {
  const { callUuid } = useParams<{ businessUuid: string; callUuid: string }>();
  const { business } = useBusiness();
  const router = useRouter();
  const callQuery = useCall(business.id, callUuid);

  const direction = callQuery.data?.direction;

  useEffect(() => {
    if (direction) {
      const segment = direction === "inbound" ? "inbound-logs" : "outbound-logs";
      router.replace(`/b/${business.id}/calls/${segment}?call=${callUuid}`);
    }
  }, [direction, business.id, callUuid, router]);

  if (callQuery.isError) {
    const notFound = callQuery.error.status === 404;
    return (
      <div className="flex flex-col items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/b/${business.id}/calls/inbound-logs`} />}
        >
          <ArrowLeftIcon />
          Call logs
        </Button>
        <ErrorState
          title={notFound ? "Call not found" : "Couldn't load this call"}
          message={
            notFound ? "This call doesn't exist or was removed." : callQuery.error.message
          }
          onRetry={notFound ? undefined : () => callQuery.refetch()}
        />
      </div>
    );
  }

  return <FullPageLoader />;
}
