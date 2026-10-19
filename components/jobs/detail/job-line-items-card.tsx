"use client";

import { useTranslations } from "next-intl";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { formatCents } from "@/lib/money";
import type { Job } from "@/lib/api/types";
import { LINE_ITEM_KIND_LABELS } from "@/lib/api/types";

/** "5.00" → "5", "1.50" → "1.5". */
function displayQuantity(quantity: string): string {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? String(parsed) : quantity;
}

/**
 * The job's costing rows, read-only — ex-tax amounts (VAT lands on the
 * invoice). Editing happens in the items dialog against the per-item
 * endpoints.
 */
export function JobLineItemsCard({ job, onEdit }: { job: Job; onEdit?: () => void }) {
  const t = useTranslations("jobs.lineItems");
  const tc = useTranslations("common");
  const items = job.line_items ?? [];
  const currency = job.currency ?? "ILS";
  const total = items.reduce((sum, item) => sum + item.amount_cents, 0);

  const editButton = onEdit && (
    <div className="flex justify-start">
      <Button size="sm" variant="outline" onClick={onEdit}>
        <PencilIcon />
        {items.length === 0 ? t("addItems") : t("editItems")}
      </Button>
    </div>
  );

  if (items.length === 0) {
    return (
      <DetailCard title={t("title")} accent>
        <p className="text-sm text-muted-foreground">
          {job.source === "agent_call" ? t("emptyFromCall") : t("empty")}
        </p>
        {editButton}
      </DetailCard>
    );
  }

  return (
    <DetailCard title={t("title")} accent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("labels.description")}</TableHead>
              <TableHead className="text-end">{t("columns.qty")}</TableHead>
              <TableHead className="text-end">{t("columns.unit")}</TableHead>
              <TableHead className="text-end">{t("columns.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-64 whitespace-normal">
                  {item.description}
                  <span className="block text-xs text-muted-foreground">
                    {LINE_ITEM_KIND_LABELS[item.kind]}
                  </span>
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {displayQuantity(item.quantity)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatCents(item.unit_price_cents, currency)}
                </TableCell>
                <TableCell className="text-end font-medium tabular-nums">
                  {formatCents(item.amount_cents, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-end justify-between gap-3">
        {editButton ?? <span />}
        <dl className="flex w-56 flex-col gap-1.5 text-sm">
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <dt>{t("totalExTax")}</dt>
            <dd className="tabular-nums">{formatCents(total, currency)}</dd>
          </div>
        </dl>
      </div>
    </DetailCard>
  );
}
