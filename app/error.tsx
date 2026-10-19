"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/error-state";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <ErrorState
      message={error.message || tc("state.unexpectedError")}
      onRetry={() => unstable_retry()}
    />
  );
}
