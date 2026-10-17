import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ApiError } from "@/lib/api/errors";

/**
 * Maps an ApiError onto a react-hook-form instance. 422 bag keys that match
 * a form field show under that field (dotted keys attach to nested fields —
 * `custom_hours.0.windows` lands on that array item as long as the root
 * segment is a form field); everything else (unknown keys, 429s, generic
 * failures) lands on `root.server`, rendered as a form-level alert.
 *
 * `mapKey` rewrites a bag key onto the form's shape first, for forms whose
 * payload nesting differs from their field layout (e.g. the agent form's
 * `config.*` keys).
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ApiError,
  options?: { mapKey?: (key: string) => string }
): void {
  if (error.status === 422 && error.errors && Object.keys(error.errors).length > 0) {
    const knownFields = new Set(Object.keys(form.getValues()));

    for (const [rawKey, messages] of Object.entries(error.errors)) {
      const key = options?.mapKey ? options.mapKey(rawKey) : rawKey;
      const rootField = key.includes(".") ? key.slice(0, key.indexOf(".")) : key;
      const message = messages[0] ?? error.message;
      if (knownFields.has(rootField)) {
        form.setError(key as Path<T>, { type: "server", message });
      } else {
        form.setError("root.server", { type: "server", message });
      }
    }
    return;
  }

  form.setError("root.server", { type: "server", message: error.message });
}
