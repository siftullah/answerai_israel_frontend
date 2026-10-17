"use client";

import { ErrorState } from "@/components/error-state";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorState
      message={error.message || "An unexpected error occurred."}
      onRetry={() => unstable_retry()}
    />
  );
}
