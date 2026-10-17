"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { useAgent } from "@/hooks/use-agents";
import {
  useRecipientsImport,
  useRecipientsImportPreview,
} from "@/hooks/use-campaign-recipients";
import type { Campaign, CampaignImportPreview } from "@/lib/api/types";
import { agentCallVariables } from "@/lib/validation/agent";

const FILE_EXTENSIONS = [".csv", ".txt", ".xls", ".xlsx"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Spreadsheet import wizard: upload → column mapping → queued import. There's
 * no progress endpoint — rows land as the job runs and the recipients tab
 * polls for a couple of minutes. An expired token drops back to upload.
 */
export function RecipientImportDialog({
  campaign,
  agentId,
  open,
  onOpenChange,
  onImported,
}: {
  campaign: Campaign;
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired on the 202 — the tab starts its settling poll. */
  onImported: () => void;
}) {
  const { business } = useBusiness();
  const previewMutation = useRecipientsImportPreview(campaign.id);
  const importMutation = useRecipientsImport(business.id, campaign.id);
  const agentQuery = useAgent(business.id, agentId);
  const declaredVariables = agentCallVariables(agentQuery.data?.config);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<CampaignImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [phoneColumn, setPhoneColumn] = useState<number | null>(null);
  const [nameColumn, setNameColumn] = useState<number | null>(null);
  const [variableMapping, setVariableMapping] = useState<Record<string, number>>({});

  const resetMapping = () => {
    setPhoneColumn(null);
    setNameColumn(null);
    setVariableMapping({});
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError("Use a CSV, TXT, XLS or XLSX file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("The file must be 10 MB or smaller.");
      return;
    }
    setError(null);
    previewMutation.mutate(file, {
      onSuccess: (result) => {
        setPreview(result);
        // Auto-map: phone/name by pattern, variables by exact header match.
        let phone: number | null = null;
        let nameCol: number | null = null;
        const variables: Record<string, number> = {};
        for (const column of result.columns) {
          const header = column.header;
          const matchedVariable = declaredVariables.find(
            (variable) => variable.name.toLowerCase() === header.trim().toLowerCase()
          );
          if (matchedVariable && variables[matchedVariable.name] === undefined) {
            variables[matchedVariable.name] = column.index;
          } else if (phone === null && /phone|mobile/i.test(header)) {
            phone = column.index;
          } else if (nameCol === null && /name/i.test(header)) {
            nameCol = column.index;
          }
        }
        setPhoneColumn(phone);
        setNameColumn(nameCol);
        setVariableMapping(variables);
      },
      onError: (apiError) => setError(apiError.message),
    });
  };

  const usedIndexes = [
    ...(phoneColumn !== null ? [phoneColumn] : []),
    ...(nameColumn !== null ? [nameColumn] : []),
    ...Object.values(variableMapping),
  ];

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows e.g. "none" or an index.
  const columnItems = (current: number | null | undefined) => [
    { value: "none", label: "Not imported" },
    ...(preview?.columns ?? [])
      .filter((column) => column.index === current || !usedIndexes.includes(column.index))
      .map((column) => ({
        value: column.index.toString(),
        label: column.header || `Column ${column.index + 1}`,
      })),
  ];

  const runImport = () => {
    if (!preview || phoneColumn === null) return;
    setError(null);
    importMutation.mutate(
      {
        token: preview.token,
        has_header_row: hasHeaderRow,
        mapping: {
          phone: phoneColumn,
          ...(nameColumn !== null ? { name: nameColumn } : {}),
          ...(Object.keys(variableMapping).length > 0 ? { variables: variableMapping } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("Import started — rows appear as they're processed.");
          onImported();
          onOpenChange(false);
        },
        onError: (apiError) => {
          if (apiError.errors?.token) {
            setPreview(null);
            resetMapping();
            setError("The upload expired — choose the file again.");
          } else {
            setError(apiError.message);
          }
        },
      }
    );
  };

  const renderColumnSelect = (
    id: string,
    label: string,
    required: boolean,
    value: number | null,
    onChange: (value: number | null) => void
  ) => {
    const items = columnItems(value);
    return (
      <Field key={id}>
        <FieldLabel htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </FieldLabel>
        <Select
          items={items}
          value={value?.toString() ?? "none"}
          onValueChange={(next) =>
            onChange(next === "none" || next === null ? null : Number(next))
          }
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Import recipients</DialogTitle>
            <DialogDescription>
              {preview
                ? "Match your spreadsheet columns to the campaign fields."
                : "Upload a spreadsheet — CSV, TXT, XLS or XLSX, up to 10 MB."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!preview ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-10">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_EXTENSIONS.join(",")}
                  className="hidden"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={previewMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewMutation.isPending ? <Spinner /> : <UploadIcon />}
                  Choose file
                </Button>
                <p className="text-sm text-muted-foreground">
                  Rows are matched to your contacts by phone number.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        {preview.columns.map((column) => (
                          <th
                            key={column.index}
                            className="px-3 py-2 font-medium whitespace-nowrap"
                          >
                            {column.header || `Column ${column.index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample_rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b last:border-0">
                          {preview.columns.map((column) => (
                            <td
                              key={column.index}
                              className="max-w-48 truncate px-3 py-1.5 whitespace-nowrap text-muted-foreground"
                            >
                              {row[column.index] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Field orientation="horizontal">
                  <Checkbox
                    id="recipients-has-header-row"
                    checked={hasHeaderRow}
                    onCheckedChange={(checked) => setHasHeaderRow(checked === true)}
                  />
                  <FieldLabel htmlFor="recipients-has-header-row" className="font-normal">
                    The first row contains column headings
                  </FieldLabel>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  {renderColumnSelect(
                    "import-phone-column",
                    "Phone column",
                    true,
                    phoneColumn,
                    setPhoneColumn
                  )}
                  {renderColumnSelect(
                    "import-name-column",
                    "Name column",
                    false,
                    nameColumn,
                    setNameColumn
                  )}
                </div>

                {declaredVariables.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Variables</p>
                    <p className="text-sm text-muted-foreground">
                      Fill the agent&apos;s placeholders per recipient from a column.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {declaredVariables.map((variable) =>
                        renderColumnSelect(
                          `import-variable-${variable.name}`,
                          variable.name,
                          false,
                          variableMapping[variable.name] ?? null,
                          (value) =>
                            setVariableMapping((current) => {
                              const next = { ...current };
                              if (value === null) {
                                delete next[variable.name];
                              } else {
                                next[variable.name] = value;
                              }
                              return next;
                            })
                        )
                      )}
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Invalid and do-not-call numbers still appear in the list with their
                  reason, so nothing disappears silently. Duplicates are skipped.
                </p>
              </>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            {preview ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={importMutation.isPending}
                  onClick={() => {
                    setPreview(null);
                    resetMapping();
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={runImport}
                  disabled={phoneColumn === null || importMutation.isPending}
                >
                  {importMutation.isPending && <Spinner />}
                  Import
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
