"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SparklesIcon, UploadIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import {
  createExtraction,
  discardExtraction,
  fetchExtraction,
} from "@/lib/api/extractions";
import { normalizeApiError } from "@/lib/api/errors";
import type {
  CreateExtractionPayload,
  Extraction,
  ExtractionSourceType,
  ExtractionTarget,
} from "@/lib/api/types";

const FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 2500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Phase = "source" | "running" | "failed";

/**
 * Shared extract-with-AI flow: pick a source (website URL or document),
 * start an extraction and poll it to completion, then hand the finished
 * extraction to the parent via onReady. The parent owns the review UX —
 * drafts are never applied automatically.
 */
export function ExtractionDialog({
  target,
  title,
  description,
  onReady,
}: {
  target: ExtractionTarget;
  title: string;
  description: string;
  onReady: (extraction: Extraction) => void;
}) {
  const t = useTranslations("businessProfile.extraction");
  const tc = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("source");
  const [sourceType, setSourceType] = useState<ExtractionSourceType>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumping the run id abandons any in-flight polling loop.
  const runIdRef = useRef(0);
  const extractionIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
    };
  }, []);

  const abandon = () => {
    runIdRef.current += 1;
    if (extractionIdRef.current) {
      discardExtraction(extractionIdRef.current);
      extractionIdRef.current = null;
    }
    setPhase("source");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && phase === "running") abandon();
    setOpen(next);
  };

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    const name = picked.name.toLowerCase();
    if (!FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError(t("errors.fileType"));
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setError(t("errors.fileSize"));
      return;
    }
    setError(null);
    setFile(picked);
  };

  const run = async (payload: CreateExtractionPayload) => {
    const runId = ++runIdRef.current;
    setError(null);
    setPhase("running");
    try {
      let extraction = await createExtraction(payload);
      extractionIdRef.current = extraction.id;
      while (extraction.status === "pending" || extraction.status === "processing") {
        await sleep(POLL_MS);
        if (runIdRef.current !== runId) return;
        extraction = await fetchExtraction(extraction.id);
      }
      if (runIdRef.current !== runId) return;
      extractionIdRef.current = null;
      if (extraction.status === "ready") {
        onReady(extraction);
        setOpen(false);
        setPhase("source");
      } else {
        setError(extraction.error ?? t("errors.failed"));
        setPhase("failed");
      }
    } catch (caught) {
      if (runIdRef.current !== runId) return;
      setError(normalizeApiError(caught).message);
      setPhase("failed");
    }
  };

  const start = () => {
    if (sourceType === "url") {
      const trimmed = url.trim();
      if (!/^https?:\/\/.+\..+/i.test(trimmed)) {
        setError(t("errors.invalidUrl"));
        return;
      }
      void run({ target, source_type: "url", source_url: trimmed });
    } else {
      if (!file) {
        setError(t("errors.noFile"));
        return;
      }
      void run({ target, source_type: "file", file });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="cta" />
        }
      >
        <SparklesIcon />
        {t("trigger")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {phase === "running" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Spinner className="size-6" />
            <p className="text-sm text-muted-foreground">
              {t("running")}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                abandon();
                setOpen(false);
              }}
            >
              {tc("actions.cancel")}
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <RadioGroup
              value={sourceType}
              onValueChange={(value) => setSourceType(value as ExtractionSourceType)}
              className="gap-2"
            >
              <Field orientation="horizontal">
                <RadioGroupItem id={`extract-${target}-url`} value="url" />
                <FieldLabel htmlFor={`extract-${target}-url`} className="font-normal">
                  {t("sourceUrl")}
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem id={`extract-${target}-file`} value="file" />
                <FieldLabel htmlFor={`extract-${target}-file`} className="font-normal">
                  {t("sourceFile")}
                </FieldLabel>
              </Field>
            </RadioGroup>

            {sourceType === "url" ? (
              <Input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={t("urlPlaceholder")}
                autoComplete="off"
              />
            ) : (
              <div className="flex items-center gap-2">
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
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon />
                  {t("chooseFile")}
                </Button>
                <span className="truncate text-sm text-muted-foreground">
                  {file ? file.name : t("noFile")}
                </span>
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>{tc("actions.cancel")}</DialogClose>
              <Button type="button" onClick={start}>
                {phase === "failed" ? tc("actions.tryAgain") : t("start")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
