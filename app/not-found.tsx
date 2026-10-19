import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default async function NotFound() {
  const t = await getTranslations("layout");
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 p-6">
      <Logo className="h-8 w-auto" />
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{t("notFound.title")}</CardTitle>
          <CardDescription>{t("notFound.description")}</CardDescription>
        </CardHeader>
        <CardContent className="justify-center">
          <Button render={<Link href="/" />}>{t("notFound.backHome")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
