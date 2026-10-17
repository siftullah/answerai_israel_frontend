"use client";

import { useFormState } from "react-hook-form";
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
  const { isDirty } = useFormState();

  if (!isDirty) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card py-1.5 pr-1.5 pl-4 shadow-lg">
        <p className="text-sm font-medium">Unsaved changes</p>
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={onSave}
          disabled={saving}
        >
          {saving && <Spinner />}
          Save
        </Button>
      </div>
    </div>
  );
}
