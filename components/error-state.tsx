"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {message && <CardDescription>{message}</CardDescription>}
        </CardHeader>
        {onRetry && (
          <CardContent>
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
