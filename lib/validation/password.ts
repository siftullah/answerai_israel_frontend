import { z } from "zod";
import type { UpdatePasswordPayload } from "@/lib/api/types";

export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "At least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  });

export type PasswordValues = z.infer<typeof passwordSchema>;

export function toPasswordPayload(values: PasswordValues): UpdatePasswordPayload {
  return {
    current_password: values.current_password,
    password: values.password,
    password_confirmation: values.password_confirmation,
  };
}
