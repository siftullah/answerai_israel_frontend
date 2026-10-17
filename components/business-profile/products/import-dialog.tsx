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
import { useProductsImport, useProductsImportPreview } from "@/hooks/use-products";
import type { ProductImportMapping, ProductImportPreview } from "@/lib/api/types";

const FILE_EXTENSIONS = [".csv", ".txt", ".xls", ".xlsx"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const IMPORT_FIELDS: { key: keyof ProductImportMapping; label: string; required?: boolean }[] = [
  { key: "name", label: "Name", required: true },
  { key: "description", label: "Description" },
  { key: "price_dollars", label: "Price (single)" },
  { key: "price_min_dollars", label: "Price minimum" },
  { key: "price_max_dollars", label: "Price maximum" },
  { key: "price_message", label: "Price message" },
];

/**
 * Spreadsheet import wizard: upload → column mapping from the preview
 * response → queued import (summary arrives by email). An expired token
 * (60 min) drops back to the upload step.
 */
export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const previewMutation = useProductsImportPreview();
  const importMutation = useProductsImport(business.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [mapping, setMapping] = useState<Partial<ProductImportMapping>>({});

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
        const nameColumn = result.columns.find((column) => /name/i.test(column.header));
        setMapping(nameColumn ? { name: nameColumn.index } : {});
      },
      onError: (apiError) => setError(apiError.message),
    });
  };

  const setField = (key: keyof ProductImportMapping, value: number | undefined) => {
    setMapping((current) => {
      const next = { ...current };
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const usedIndexes = (except: keyof ProductImportMapping) =>
    new Set(
      IMPORT_FIELDS.filter((field) => field.key !== except)
        .map((field) => mapping[field.key])
        .filter((value): value is number => value !== undefined)
    );

  const runImport = () => {
    if (!preview || mapping.name === undefined) return;
    setError(null);
    importMutation.mutate(
      {
        token: preview.token,
        has_header_row: hasHeaderRow,
        mapping: mapping as ProductImportMapping,
      },
      {
        onSuccess: () => {
          toast.success("Import started — you'll get a summary by email.");
          onOpenChange(false);
        },
        onError: (apiError) => {
          if (apiError.errors?.token) {
            setPreview(null);
            setMapping({});
            setError("The upload expired — choose the file again.");
          } else {
            setError(apiError.message);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Import products</DialogTitle>
            <DialogDescription>
              {preview
                ? "Match your spreadsheet columns to product fields."
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
                  Rows are matched to existing products by name.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        {preview.columns.map((column) => (
                          <th key={column.index} className="px-3 py-2 font-medium whitespace-nowrap">
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
                    id="has-header-row"
                    checked={hasHeaderRow}
                    onCheckedChange={(checked) => setHasHeaderRow(checked === true)}
                  />
                  <FieldLabel htmlFor="has-header-row" className="font-normal">
                    The first row contains column headings
                  </FieldLabel>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  {IMPORT_FIELDS.map((field) => {
                    const taken = usedIndexes(field.key);
                    // Base UI's SelectValue renders the raw value unless the
                    // root knows the item labels — without this the trigger
                    // shows e.g. "none" or the column index.
                    const columnItems = [
                      { value: "none", label: "Not imported" },
                      ...preview.columns
                        .filter((column) => !taken.has(column.index))
                        .map((column) => ({
                          value: column.index.toString(),
                          label: column.header || `Column ${column.index + 1}`,
                        })),
                    ];
                    return (
                      <Field key={field.key}>
                        <FieldLabel htmlFor={`import-${field.key}`}>
                          {field.label}
                          {field.required && <span className="text-destructive"> *</span>}
                        </FieldLabel>
                        <Select
                          items={columnItems}
                          value={mapping[field.key]?.toString() ?? "none"}
                          onValueChange={(value) =>
                            setField(
                              field.key,
                              value === "none" || value === null
                                ? undefined
                                : Number(value)
                            )
                          }
                        >
                          <SelectTrigger id={`import-${field.key}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columnItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    );
                  })}
                </div>

                <p className="text-sm text-muted-foreground">
                  One price column sets a fixed price; minimum + maximum make a range; a
                  price message becomes a custom message. Imported products start enabled
                  for all agents.
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
                    setMapping({});
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={runImport}
                  disabled={mapping.name === undefined || importMutation.isPending}
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
