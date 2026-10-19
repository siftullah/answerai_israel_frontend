"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteBusinessLogo, useUploadBusinessLogo } from "@/hooks/use-business-profile";
import type { BusinessLogo } from "@/lib/api/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

export function LogoCard({
  businessUuid,
  logo,
}: {
  businessUuid: string;
  logo: BusinessLogo | null;
}) {
  const t = useTranslations("businessProfile.logo");
  const tc = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadBusinessLogo(businessUuid);
  const remove = useDeleteBusinessLogo(businessUuid);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("toasts.invalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("toasts.tooLarge"));
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success(t("toasts.updated")),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not an optimizable static asset
          <img
            src={logo.url}
            alt={t("alt")}
            className="size-16 shrink-0 rounded-xl border object-contain p-1"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            <ImageIcon className="size-6" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending && <Spinner />}
            {logo ? t("replace") : t("upload")}
          </Button>
          {logo && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button type="button" variant="ghost" disabled={remove.isPending} />}
              >
                {remove.isPending && <Spinner />}
                {tc("actions.remove")}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("removeDialog.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      remove.mutate(undefined, {
                        onSuccess: () => toast.success(t("toasts.removed")),
                        onError: (error) => toast.error(error.message),
                      })
                    }
                  >
                    {tc("actions.remove")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
