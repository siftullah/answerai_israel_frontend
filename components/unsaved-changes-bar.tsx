"use client";

import { useFormState } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Floating save bar — a detail page's single submit surface. Rendered
 * inside the FormProvider; only visible while the form is dirty.
 */
export function UnsavedChangesBar({
  onSave,
  onDiscard,
  saving,
}: {
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const t = useTranslations("ui");
  const tc = useTranslations("common");
  const { isDirty } = useFormState();

  if (!isDirty) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card py-1.5 pe-1.5 ps-4 shadow-lg">
        <p className="text-sm font-medium">{t("unsavedChanges.title")}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
          {tc("actions.discard")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={onSave}
          disabled={saving}
        >
          {saving && <Spinner />}
          {tc("actions.save")}
        </Button>
      </div>
    </div>
  );
}
