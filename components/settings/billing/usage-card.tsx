"use client";

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
import type { PlanEntitlements, UsageSnapshot } from "@/lib/api/types";

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
  const value = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used.toLocaleString()} / {included.toLocaleString()} min
        </span>
      </div>
      <Progress value={value} aria-label={label} />
      {overageMinutes > 0 ? (
        <p className="text-xs text-warning">
          {overageMinutes.toLocaleString()} min over — billed at{" "}
          {formatCents(overageCentsPerMin)}/min with the next renewal. Service is never cut for
          usage.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Overage past this allowance bills at {formatCents(overageCentsPerMin)}/min.
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
  const outboundCost = usage.outbound_minutes * entitlements.outbound_cents_per_min;
  const extraNumbersCost = usage.extra_numbers * entitlements.additional_number_cents;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage this period</CardTitle>
        <CardDescription>
          {formatDate(usage.period_start, timezone)} – {formatDate(usage.period_end, timezone)}.
          Usage charges are billed in arrears with each monthly renewal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <AllowanceMeter
          label="Inbound AI minutes"
          used={usage.inbound_minutes_used}
          included={usage.inbound_minutes_included}
          overageMinutes={usage.inbound_overage_minutes}
          overageCentsPerMin={entitlements.inbound_overage_cents_per_min}
        />
        <AllowanceMeter
          label="Transfer talk-time"
          used={usage.transfer_minutes_used}
          included={usage.transfer_pool_minutes}
          overageMinutes={usage.transfer_overage_minutes}
          overageCentsPerMin={entitlements.transfer_overage_cents_per_min}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">Outbound calling</span>
            <span className="tabular-nums text-muted-foreground">
              {usage.outbound_minutes.toLocaleString()} min
              {outboundCost > 0 && ` · ≈ ${formatCents(outboundCost)}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Pay as you go at {formatCents(entitlements.outbound_cents_per_min)}/min — no
            included allowance.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">Extra phone numbers</span>
            <span className="tabular-nums text-muted-foreground">
              {usage.extra_numbers}
              {extraNumbersCost > 0 && ` · ${formatCents(extraNumbersCost)}/month`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {entitlements.included_numbers}{" "}
            {entitlements.included_numbers === 1 ? "number is" : "numbers are"} included with
            your plan; each extra bills at{" "}
            {formatCents(entitlements.additional_number_cents)}/month.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
