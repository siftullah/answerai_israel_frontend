"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import type { ModuleKey } from "@/lib/api/types";

/**
 * Renders children only while the module is enabled for the current
 * business. A direct hit on a disabled module's URL shows a card — no
 * redirect, mirroring the no-access card in the business layout.
 */
export function ModuleGate({
  module,
  children,
}: {
  module: ModuleKey;
  children: React.ReactNode;
}) {
  const { business, membership } = useBusiness();
  const enabled = useModuleEnabled(module);
  const t = useTranslations("business");

  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";

  if (!enabled) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>{t("moduleGate.title")}</CardTitle>
            <CardDescription>{t("moduleGate.description")}</CardDescription>
          </CardHeader>
          {/* Members can't reach that page, so don't send them to a dead end. */}
          {privileged && (
            <CardContent className="justify-center">
              <Button render={<Link href={`/b/${business.id}/business-profile/modules`} />}>
                {t("moduleGate.goToModules")}
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
