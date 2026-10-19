import { z } from "zod";
import type { UpdatePasswordPayload } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";

/** `t` is a translator scoped to the `validation` namespace. */
export function passwordSchema(t: Translator) {
  return z
    .object({
      current_password: z.string().min(1, t("password.currentRequired")),
      password: z.string().min(8, t("password.min", { min: 8 })),
      password_confirmation: z.string().min(1, t("password.confirmationRequired")),
    })
    .refine((values) => values.password === values.password_confirmation, {
      message: t("password.mismatch"),
      path: ["password_confirmation"],
    });
}

export type PasswordValues = z.infer<ReturnType<typeof passwordSchema>>;

export function toPasswordPayload(values: PasswordValues): UpdatePasswordPayload {
  return {
    current_password: values.current_password,
    password: values.password,
    password_confirmation: values.password_confirmation,
  };
}
