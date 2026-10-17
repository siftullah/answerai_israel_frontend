import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 p-6">
      <Logo className="h-8 w-auto" />
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you are looking for doesn&apos;t exist or has moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="justify-center">
          <Button render={<Link href="/" />}>Back to AnswerAI</Button>
        </CardContent>
      </Card>
    </div>
  );
}
