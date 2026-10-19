"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { EllipsisVerticalIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { CampaignRecipientStatusBadge } from "@/components/campaigns/campaign-status-badge";
import type { Campaign, CampaignRecipient } from "@/lib/api/types";
import { RETRYABLE_RECIPIENT_STATUSES } from "@/lib/api/types";
import { formatDateAndTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

export interface RecipientListSelection {
  isSelected: (id: string) => boolean;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  headerChecked: boolean;
  headerIndeterminate: boolean;
}

export function recipientIsRetryable(recipient: CampaignRecipient, campaign: Campaign) {
  return (
    RETRYABLE_RECIPIENT_STATUSES.includes(recipient.status) &&
    campaign.status !== "canceled"
  );
}

function variableLabel(name: string, builtinLabels: Record<string, string>): string {
  const known = builtinLabels[name];
  if (known) return known;
  const spaced = name.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The values a recipient row carries into its call, blanks dropped. */
function recipientVariables(recipient: CampaignRecipient): [string, string][] {
  return Object.entries(recipient.variables ?? {}).filter(
    ([, value]) => typeof value === "string" && value.trim() !== ""
  );
}

/** Clamp long free text to one line, with the full value in a tooltip. */
function Truncated({ text, className }: { text: string; className?: string }) {
  if (text.length <= 40) {
    return <span className={className}>{text}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={className} />}>{text}</TooltipTrigger>
      <TooltipContent className="max-w-72">{text}</TooltipContent>
    </Tooltip>
  );
}

export function RecipientsTable({
  recipients,
  campaign,
  businessUuid,
  timeZone,
  selection,
  onRetry,
  onDelete,
}: {
  recipients: CampaignRecipient[];
  campaign: Campaign;
  businessUuid: string;
  timeZone: string;
  selection: RecipientListSelection;
  onRetry: (recipient: CampaignRecipient) => void;
  onDelete: (recipient: CampaignRecipient) => void;
}) {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  // A campaign built from the contact book carries no variables — keep its table lean.
  const showVariables = recipients.some((recipient) => recipientVariables(recipient).length > 0);
  /** Short column labels for the contact built-ins a campaign may supply per recipient. */
  const builtinLabels: Record<string, string> = {
    contact_name: tc("labels.name"),
    contact_email: tc("labels.email"),
    contact_company: t("recipients.table.company"),
    contact_address: t("recipients.table.address"),
  };

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label={t("recipients.table.selectAll")}
                checked={selection.headerChecked}
                indeterminate={selection.headerIndeterminate}
                onCheckedChange={selection.onToggleAll}
              />
            </TableHead>
            <TableHead>{tc("labels.phone")}</TableHead>
            {showVariables && <TableHead>{t("recipients.table.variables")}</TableHead>}
            <TableHead>{tc("labels.status")}</TableHead>
            <TableHead>{t("recipients.table.attempts")}</TableHead>
            <TableHead>{t("recipients.table.nextAttempt")}</TableHead>
            <TableHead>{t("recipients.table.lastResult")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((recipient) => {
            const result = recipient.error ?? recipient.last_outcome;
            const variables = recipientVariables(recipient);
            return (
              <TableRow key={recipient.id}>
                <TableCell>
                  <Checkbox
                    aria-label={t("a11y.selectItem", { name: formatE164(recipient.to_e164) })}
                    checked={selection.isSelected(recipient.id)}
                    onCheckedChange={() => selection.onToggleRow(recipient.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap tabular-nums">
                      {formatE164(recipient.to_e164)}
                    </span>
                    {recipient.contact && (
                      <Link
                        href={`/b/${businessUuid}/contacts/${recipient.contact.id}`}
                        className="max-w-44 truncate text-sm text-muted-foreground hover:underline"
                      >
                        {recipient.contact.name ?? t("recipients.table.unnamedContact")}
                      </Link>
                    )}
                  </div>
                </TableCell>
                {showVariables && (
                  <TableCell>
                    {variables.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <dl className="flex max-w-64 flex-col gap-0.5 text-sm">
                        {variables.map(([name, value]) => (
                          <div key={name} className="flex min-w-0 gap-1.5">
                            <dt className="shrink-0 text-muted-foreground">
                              {variableLabel(name, builtinLabels)}
                            </dt>
                            <dd className="min-w-0">
                              <Truncated text={value} className="block truncate" />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <CampaignRecipientStatusBadge status={recipient.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {t("recipients.table.attemptsOf", {
                    attempts: recipient.attempts,
                    max: campaign.max_attempts,
                  })}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {recipient.status === "retry_scheduled" && recipient.next_attempt_at
                    ? formatDateAndTime(recipient.next_attempt_at, timeZone)
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {result ? <Truncated text={result} className="block max-w-56 truncate" /> : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("a11y.actionsFor", {
                            name: formatE164(recipient.to_e164),
                          })}
                        />
                      }
                    >
                      <EllipsisVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {recipientIsRetryable(recipient, campaign) && (
                        <DropdownMenuItem onClick={() => onRetry(recipient)}>
                          <RotateCcwIcon />
                          {tc("actions.retry")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(recipient)}
                      >
                        <Trash2Icon />
                        {tc("actions.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
