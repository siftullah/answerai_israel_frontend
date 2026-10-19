"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title ?? tc("state.somethingWentWrong")}</CardTitle>
          {message && <CardDescription>{message}</CardDescription>}
        </CardHeader>
        {onRetry && (
          <CardContent>
            <Button variant="outline" onClick={onRetry}>
              {tc("actions.tryAgain")}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
