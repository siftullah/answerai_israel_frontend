"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
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

const IMPORT_FIELDS: { key: keyof ProductImportMapping; required?: boolean }[] = [
  { key: "name", required: true },
  { key: "description" },
  { key: "price_dollars" },
  { key: "price_min_dollars" },
  { key: "price_max_dollars" },
  { key: "price_message" },
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
  const t = useTranslations("knowledge.products.import");
  const ts = useTranslations("knowledge.shared");
  const tc = useTranslations("common");
  const previewMutation = useProductsImportPreview();
  const importMutation = useProductsImport(business.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fieldLabels: Record<keyof ProductImportMapping, string> = {
    name: tc("labels.name"),
    description: tc("labels.description"),
    price_dollars: t("fields.priceSingle"),
    price_min_dollars: t("fields.priceMin"),
    price_max_dollars: t("fields.priceMax"),
    price_message: t("fields.priceMessage"),
  };
  const columnLabel = (column: { index: number; header: string }) =>
    column.header || t("column", { number: column.index + 1 });

  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [mapping, setMapping] = useState<Partial<ProductImportMapping>>({});

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError(t("invalidFileType"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(ts("fileTooLarge"));
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
          toast.success(t("started"));
          onOpenChange(false);
        },
        onError: (apiError) => {
          if (apiError.errors?.token) {
            setPreview(null);
            setMapping({});
            setError(t("expired"));
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
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {preview ? t("mapDescription") : t("uploadDescription")}
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
                  {ts("chooseFile")}
                </Button>
                <p className="text-sm text-muted-foreground">{t("matchHint")}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-start">
                        {preview.columns.map((column) => (
                          <th key={column.index} className="px-3 py-2 font-medium whitespace-nowrap">
                            {columnLabel(column)}
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
                    {t("headerRow")}
                  </FieldLabel>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  {IMPORT_FIELDS.map((field) => {
                    const taken = usedIndexes(field.key);
                    // Base UI's SelectValue renders the raw value unless the
                    // root knows the item labels — without this the trigger
                    // shows e.g. "none" or the column index.
                    const columnItems = [
                      { value: "none", label: t("notImported") },
                      ...preview.columns
                        .filter((column) => !taken.has(column.index))
                        .map((column) => ({
                          value: column.index.toString(),
                          label: columnLabel(column),
                        })),
                    ];
                    return (
                      <Field key={field.key}>
                        <FieldLabel htmlFor={`import-${field.key}`}>
                          {fieldLabels[field.key]}
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

                <p className="text-sm text-muted-foreground">{t("priceHint")}</p>
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
                  {tc("actions.back")}
                </Button>
                <Button
                  type="button"
                  onClick={runImport}
                  disabled={mapping.name === undefined || importMutation.isPending}
                >
                  {importMutation.isPending && <Spinner />}
                  {tc("actions.import")}
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {tc("actions.cancel")}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
