"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChargeStatusBadge } from "@/components/billing/billing-badges";
import { useBillingChargesInfinite } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { displayLocale } from "@/lib/i18n/runtime";
import { BILLING_CHARGE_TYPE_LABELS, taxLineLabel, type BillingCharge } from "@/lib/api/types";

function ChargeDetails({ charge, timezone }: { charge: BillingCharge; timezone: string }) {
  const t = useTranslations("settings.billing.charges");
  const tc = useTranslations("common");
  return (
    <div className="flex max-w-xl flex-col gap-1.5 py-1 text-sm">
      {charge.line_items.map((line, index) => (
        <div key={index} className="flex items-start justify-between gap-4">
          <span className={line.amount_cents < 0 ? "text-success" : undefined}>
            {line.description}
            {line.quantity > 1 &&
              ` ${t("lineQuantity", {
                quantity: line.quantity.toLocaleString(displayLocale()),
                unit: formatCents(line.unit_cents, charge.currency),
              })}`}
          </span>
          <span className="tabular-nums">{formatCents(line.amount_cents, charge.currency)}</span>
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>{tc("labels.subtotal")}</span>
        <span className="tabular-nums">{formatCents(charge.subtotal_cents, charge.currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>{taxLineLabel()}</span>
        <span className="tabular-nums">{formatCents(charge.tax_cents, charge.currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 font-medium">
        <span>{tc("labels.total")}</span>
        <span className="tabular-nums">{formatCents(charge.total_cents, charge.currency)}</span>
      </div>
      {charge.gateway_fee_cents !== null && charge.gateway_fee_cents > 0 && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>{t("cardSurcharge")}</span>
          <span className="tabular-nums">
            {formatCents(charge.gateway_fee_cents, charge.currency)}
          </span>
        </div>
      )}
      {charge.receipt_number && (
        <p className="pt-1 text-xs text-muted-foreground">
          {charge.paid_at
            ? t("receiptPaid", {
                number: charge.receipt_number,
                date: formatDateTime(charge.paid_at, timezone),
              })
            : t("receipt", { number: charge.receipt_number })}
        </p>
      )}
      {charge.status === "failed" && (
        <p className="pt-1 text-xs text-destructive">
          {charge.failure_reason ?? t("failed")}
          {charge.next_retry_at &&
            ` ${t("nextRetry", { date: formatDateTime(charge.next_retry_at, timezone) })}`}
        </p>
      )}
    </div>
  );
}

export function ChargeHistoryCard({
  businessUuid,
  timezone,
}: {
  businessUuid: string;
  timezone: string;
}) {
  const t = useTranslations("settings.billing.charges");
  const tc = useTranslations("common");
  const chargesQuery = useBillingChargesInfinite(businessUuid);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const charges = chargesQuery.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {chargesQuery.isPending && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {chargesQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle>{t("loadError")}</AlertTitle>
            <AlertDescription>{chargesQuery.error.message}</AlertDescription>
          </Alert>
        )}

        {chargesQuery.isSuccess && charges.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}

        {charges.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("labels.date")}</TableHead>
                <TableHead>{tc("labels.description")}</TableHead>
                <TableHead>{tc("labels.status")}</TableHead>
                <TableHead className="max-md:hidden">{t("receiptColumn")}</TableHead>
                <TableHead className="text-end">{tc("labels.total")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((charge) => {
                const open = expanded.has(charge.id);
                return (
                  <Fragment key={charge.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggle(charge.id)}>
                      <TableCell>{formatDate(charge.created_at, timezone)}</TableCell>
                      <TableCell>
                        {BILLING_CHARGE_TYPE_LABELS[charge.type]}
                        {charge.period_start && charge.period_end && (
                          <span className="text-muted-foreground max-md:hidden">
                            {" "}
                            · {formatDate(charge.period_start, timezone)} –{" "}
                            {formatDate(charge.period_end, timezone)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChargeStatusBadge status={charge.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground max-md:hidden">
                        {charge.receipt_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatCents(charge.total_cents, charge.currency)}
                      </TableCell>
                      <TableCell>
                        <ChevronDownIcon
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            open && "rotate-180"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="bg-muted/30">
                          <ChargeDetails charge={charge} timezone={timezone} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        {chargesQuery.hasNextPage && (
          <div>
            <Button
              variant="outline"
              onClick={() => void chargesQuery.fetchNextPage()}
              disabled={chargesQuery.isFetchingNextPage}
            >
              {chargesQuery.isFetchingNextPage && <Spinner data-icon="inline-start" />}
              {t("loadMore")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
