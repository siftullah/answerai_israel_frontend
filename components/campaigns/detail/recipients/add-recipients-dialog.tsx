"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { toastRecipientsSummary } from "@/components/campaigns/detail/recipients/summary";
import { useAgent } from "@/hooks/use-agents";
import { useAddRecipients } from "@/hooks/use-campaign-recipients";
import type { Campaign } from "@/lib/api/types";
import { agentCallVariables } from "@/lib/validation/agent";

const MAX_ROWS = 20;

interface RecipientRow {
  phone: string;
  name: string;
  variables: Record<string, string>;
}

const EMPTY_ROW: RecipientRow = { phone: "", name: "", variables: {} };

/** Manual entry for a handful of numbers — big lists go through CSV import. */
export function AddRecipientsDialog({
  campaign,
  agentId,
  open,
  onOpenChange,
}: {
  campaign: Campaign;
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("campaigns.recipients");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const addRecipients = useAddRecipients(business.id, campaign.id);
  const agentQuery = useAgent(business.id, agentId);
  const declaredVariables = agentCallVariables(agentQuery.data?.config);

  const [rows, setRows] = useState<RecipientRow[]>([EMPTY_ROW]);

  const patchRow = (index: number, patch: Partial<RecipientRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const filledRows = rows.filter((row) => row.phone.trim() !== "");

  const submit = () => {
    addRecipients.mutate(
      {
        recipients: filledRows.map((row) => {
          const variables = Object.fromEntries(
            Object.entries(row.variables).filter(([, value]) => value.trim() !== "")
          );
          return {
            phone: row.phone.trim(),
            ...(row.name.trim() !== "" ? { name: row.name.trim() } : {}),
            ...(Object.keys(variables).length > 0 ? { variables } : {}),
          };
        }),
      },
      {
        onSuccess: (summary) => {
          toastRecipientsSummary(summary);
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(
            error.reason === "campaign_locked" ? t("errors.locked") : error.message
          ),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(44rem,85dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("add")}</DialogTitle>
          <DialogDescription>{t("addDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-6">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-xl border p-3">
              <div className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Input
                    value={row.phone}
                    placeholder={t("addDialog.phonePlaceholder")}
                    aria-label={t("addDialog.rowPhone", { index: index + 1 })}
                    autoComplete="off"
                    onChange={(event) => patchRow(index, { phone: event.target.value })}
                  />
                  <Input
                    value={row.name}
                    placeholder={t("addDialog.namePlaceholder")}
                    aria-label={t("addDialog.rowName", { index: index + 1 })}
                    autoComplete="off"
                    onChange={(event) => patchRow(index, { name: event.target.value })}
                  />
                </div>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("addDialog.removeRow", { index: index + 1 })}
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>

              {declaredVariables.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {declaredVariables.map((variable) => (
                    <Input
                      key={variable.name}
                      value={row.variables[variable.name] ?? ""}
                      placeholder={`{{${variable.name}}}`}
                      aria-label={t("addDialog.rowVariable", {
                        index: index + 1,
                        variable: variable.name,
                      })}
                      autoComplete="off"
                      onChange={(event) =>
                        patchRow(index, {
                          variables: { ...row.variables, [variable.name]: event.target.value },
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rows.length >= MAX_ROWS}
              onClick={() => setRows((current) => [...current, EMPTY_ROW])}
            >
              <PlusIcon />
              {t("addDialog.addAnother")}
            </Button>
            {rows.length >= MAX_ROWS && (
              <p className="text-sm text-muted-foreground">{t("addDialog.bigListHint")}</p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button
            type="button"
            disabled={filledRows.length === 0 || addRecipients.isPending}
            onClick={submit}
          >
            {addRecipients.isPending && <Spinner />}
            {t("addDialog.submit", { count: filledRows.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
