"use client";

import { useRef, useState } from "react";
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
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
import { useContactsImport, useContactsImportPreview } from "@/hooks/use-contacts";
import type { ContactImportMapping, ContactImportPreview } from "@/lib/api/types";

const FILE_EXTENSIONS = [".csv", ".txt", ".xls", ".xlsx"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type ScalarKey = "name" | "company" | "address" | "tags";

const SCALAR_FIELDS: { key: ScalarKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "address", label: "Address" },
  { key: "tags", label: "Tags" },
];

/**
 * Spreadsheet import wizard: upload → column mapping → queued import (summary
 * arrives by email; there's no progress endpoint). Unlike products, phones and
 * emails map to ARRAYS of columns — slots hold null until a column is chosen.
 * An expired token (60 min) drops back to the upload step.
 */
export function ContactImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const previewMutation = useContactsImportPreview();
  const importMutation = useContactsImport(business.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<ContactImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [scalarMapping, setScalarMapping] = useState<Partial<Record<ScalarKey, number>>>({});
  const [phoneSlots, setPhoneSlots] = useState<(number | null)[]>([]);
  const [emailSlots, setEmailSlots] = useState<(number | null)[]>([]);

  const resetMapping = () => {
    setScalarMapping({});
    setPhoneSlots([]);
    setEmailSlots([]);
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
        // Auto-map by header; company checked before name so "Company name"
        // headers don't land on Name.
        const scalars: Partial<Record<ScalarKey, number>> = {};
        const phones: number[] = [];
        const emails: number[] = [];
        for (const column of result.columns) {
          const header = column.header;
          if (/phone|mobile/i.test(header)) phones.push(column.index);
          else if (/e-?mail/i.test(header)) emails.push(column.index);
          else if (/company|business/i.test(header) && scalars.company === undefined)
            scalars.company = column.index;
          else if (/name/i.test(header) && scalars.name === undefined)
            scalars.name = column.index;
          else if (/address/i.test(header) && scalars.address === undefined)
            scalars.address = column.index;
          else if (/tag/i.test(header) && scalars.tags === undefined)
            scalars.tags = column.index;
        }
        setScalarMapping(scalars);
        setPhoneSlots(phones.length > 0 ? phones : [null]);
        setEmailSlots(emails);
      },
      onError: (apiError) => setError(apiError.message),
    });
  };

  const usedIndexes = [
    ...Object.values(scalarMapping).filter((value): value is number => value !== undefined),
    ...phoneSlots.filter((value): value is number => value !== null),
    ...emailSlots.filter((value): value is number => value !== null),
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

  const mappedPhones = phoneSlots.filter((value): value is number => value !== null);

  const runImport = () => {
    if (!preview || mappedPhones.length === 0) return;
    setError(null);
    const mappedEmails = emailSlots.filter((value): value is number => value !== null);
    const mapping: ContactImportMapping = {
      phones: mappedPhones,
      ...(mappedEmails.length > 0 ? { emails: mappedEmails } : {}),
      ...scalarMapping,
    };
    importMutation.mutate(
      { token: preview.token, has_header_row: hasHeaderRow, mapping },
      {
        onSuccess: () => {
          toast.success("Import started — you'll get a summary by email.");
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

  const renderSlots = (
    kind: "phones" | "emails",
    slots: (number | null)[],
    setSlots: (slots: (number | null)[]) => void
  ) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {kind === "phones" ? "Phone columns" : "Email columns"}
          {kind === "phones" && <span className="text-destructive"> *</span>}
        </p>
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={slots.length >= (preview?.columns.length ?? 0)}
          onClick={() => setSlots([...slots, null])}
        >
          <PlusIcon />
          Add column
        </Button>
      </div>
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No columns mapped.</p>
      ) : (
        slots.map((slot, index) => {
          const items = columnItems(slot);
          return (
            <div key={`${kind}-${index}`} className="flex items-center gap-2">
              <Select
                items={items}
                value={slot?.toString() ?? "none"}
                onValueChange={(value) => {
                  const next = [...slots];
                  next[index] = value === "none" || value === null ? null : Number(value);
                  setSlots(next);
                }}
              >
                <SelectTrigger
                  aria-label={`${kind === "phones" ? "Phone" : "Email"} column ${index + 1}`}
                  className="w-full"
                >
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${kind === "phones" ? "phone" : "email"} column ${index + 1}`}
                onClick={() => setSlots(slots.filter((_, slotIndex) => slotIndex !== index))}
              >
                <Trash2Icon />
              </Button>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Import contacts</DialogTitle>
            <DialogDescription>
              {preview
                ? "Match your spreadsheet columns to contact fields."
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
                  Rows are matched to existing contacts by phone number.
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
                  {renderSlots("phones", phoneSlots, setPhoneSlots)}
                  {renderSlots("emails", emailSlots, setEmailSlots)}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {SCALAR_FIELDS.map((field) => {
                    const items = columnItems(scalarMapping[field.key]);
                    return (
                      <Field key={field.key}>
                        <FieldLabel htmlFor={`import-${field.key}`}>{field.label}</FieldLabel>
                        <Select
                          items={items}
                          value={scalarMapping[field.key]?.toString() ?? "none"}
                          onValueChange={(value) =>
                            setScalarMapping((current) => {
                              const next = { ...current };
                              if (value === "none" || value === null) {
                                delete next[field.key];
                              } else {
                                next[field.key] = Number(value);
                              }
                              return next;
                            })
                          }
                        >
                          <SelectTrigger id={`import-${field.key}`} className="w-full">
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
                  })}
                </div>

                <p className="text-sm text-muted-foreground">
                  Rows matching an existing contact by phone enrich it — new phones, emails
                  and tags are added, blanks are filled, and nothing is overwritten. A tags
                  column can hold several tags separated by commas.
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
                  disabled={mappedPhones.length === 0 || importMutation.isPending}
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
