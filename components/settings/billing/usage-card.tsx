"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { displayLocale } from "@/lib/i18n/runtime";
import type { PlanEntitlements, UsageSnapshot } from "@/lib/api/types";

/** Plain counts in the UI locale (Latin digits in every language). */
function formatCount(value: number): string {
  return value.toLocaleString(displayLocale());
}

/** Metered allowance with a pool: progress bar + overage callout. */
function AllowanceMeter({
  label,
  used,
  included,
  overageMinutes,
  overageCentsPerMin,
}: {
  label: string;
  used: number;
  included: number;
  overageMinutes: number;
  overageCentsPerMin: number;
}) {
  const t = useTranslations("settings.billing.usage");
  const value = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {t("minutesOf", { used: formatCount(used), included: formatCount(included) })}
        </span>
      </div>
      <Progress value={value} aria-label={label} />
      {overageMinutes > 0 ? (
        <p className="text-xs text-warning">
          {t("over", {
            minutes: formatCount(overageMinutes),
            rate: formatCents(overageCentsPerMin),
          })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("overageRate", { rate: formatCents(overageCentsPerMin) })}
        </p>
      )}
    </div>
  );
}

export function UsageCard({
  usage,
  entitlements,
  timezone,
}: {
  usage: UsageSnapshot;
  entitlements: Required<PlanEntitlements>;
  timezone: string;
}) {
  const t = useTranslations("settings.billing.usage");
  const outboundCost = usage.outbound_minutes * entitlements.outbound_cents_per_min;
  const extraNumbersCost = usage.extra_numbers * entitlements.additional_number_cents;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", {
            start: formatDate(usage.period_start, timezone),
            end: formatDate(usage.period_end, timezone),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <AllowanceMeter
          label={t("inbound")}
          used={usage.inbound_minutes_used}
          included={usage.inbound_minutes_included}
          overageMinutes={usage.inbound_overage_minutes}
          overageCentsPerMin={entitlements.inbound_overage_cents_per_min}
        />
        <AllowanceMeter
          label={t("transfer")}
          used={usage.transfer_minutes_used}
          included={usage.transfer_pool_minutes}
          overageMinutes={usage.transfer_overage_minutes}
          overageCentsPerMin={entitlements.transfer_overage_cents_per_min}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">{t("outbound")}</span>
            <span className="tabular-nums text-muted-foreground">
              {t("minutes", { minutes: formatCount(usage.outbound_minutes) })}
              {outboundCost > 0 &&
                ` · ${t("approxCost", { amount: formatCents(outboundCost) })}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("outboundNote", { rate: formatCents(entitlements.outbound_cents_per_min) })}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">{t("extraNumbers")}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCount(usage.extra_numbers)}
              {extraNumbersCost > 0 &&
                ` · ${t("perMonth", { amount: formatCents(extraNumbersCost) })}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("includedNumbers", {
              count: entitlements.included_numbers,
              rate: formatCents(entitlements.additional_number_cents),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
