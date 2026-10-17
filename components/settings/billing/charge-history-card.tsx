"use client";

import { Fragment, useState } from "react";
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
import { BILLING_CHARGE_TYPE_LABELS, type BillingCharge } from "@/lib/api/types";

function ChargeDetails({ charge, timezone }: { charge: BillingCharge; timezone: string }) {
  return (
    <div className="flex max-w-xl flex-col gap-1.5 py-1 text-sm">
      {charge.line_items.map((line, index) => (
        <div key={index} className="flex items-start justify-between gap-4">
          <span className={line.amount_cents < 0 ? "text-success" : undefined}>
            {line.description}
            {line.quantity > 1 &&
              ` (${line.quantity.toLocaleString()} × ${formatCents(line.unit_cents, charge.currency)})`}
          </span>
          <span className="tabular-nums">{formatCents(line.amount_cents, charge.currency)}</span>
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatCents(charge.subtotal_cents, charge.currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>GST (10%)</span>
        <span className="tabular-nums">{formatCents(charge.gst_cents, charge.currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 font-medium">
        <span>Total</span>
        <span className="tabular-nums">{formatCents(charge.total_cents, charge.currency)}</span>
      </div>
      {charge.gateway_fee_cents !== null && charge.gateway_fee_cents > 0 && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Card surcharge (added by the payment provider)</span>
          <span className="tabular-nums">
            {formatCents(charge.gateway_fee_cents, charge.currency)}
          </span>
        </div>
      )}
      {charge.receipt_number && (
        <p className="pt-1 text-xs text-muted-foreground">
          Receipt {charge.receipt_number}
          {charge.paid_at && ` · paid ${formatDateTime(charge.paid_at, timezone)}`}
        </p>
      )}
      {charge.status === "failed" && (
        <p className="pt-1 text-xs text-destructive">
          {charge.failure_reason ?? "The charge failed."}
          {charge.next_retry_at &&
            ` Next automatic retry ${formatDateTime(charge.next_retry_at, timezone)}.`}
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
        <CardTitle>Charge history</CardTitle>
        <CardDescription>
          Every subscription charge, with its full tax-invoice breakdown. Amounts in AUD.
        </CardDescription>
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
            <AlertTitle>Couldn&apos;t load charges</AlertTitle>
            <AlertDescription>{chargesQuery.error.message}</AlertDescription>
          </Alert>
        )}

        {chargesQuery.isSuccess && charges.length === 0 && (
          <p className="text-sm text-muted-foreground">No charges yet.</p>
        )}

        {charges.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="max-md:hidden">Receipt</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                      <TableCell className="text-right tabular-nums">
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
              Load more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
