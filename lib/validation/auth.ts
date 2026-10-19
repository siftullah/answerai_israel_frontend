import { z } from "zod";
import type { Translator } from "@/lib/i18n/types";

/** Every schema takes a translator scoped to the `validation` namespace. */
const email = (t: Translator) => z.email(t("common.emailInvalid"));
const newPassword = (t: Translator) =>
  z.string().min(8, t("auth.passwordMin", { min: 8 }));

export function loginSchema(t: Translator) {
  return z.object({
    email: email(t),
    password: z.string().min(1, t("auth.passwordRequired")),
    remember: z.boolean(),
  });
}
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

export function registerSchema(t: Translator) {
  return z.object({
    first_name: z.string().min(1, t("common.firstNameRequired")).max(100),
    last_name: z.string().min(1, t("common.lastNameRequired")).max(100),
    email: email(t),
    password: newPassword(t),
    business_name: z.string().min(1, t("common.businessNameRequired")).max(200),
  });
}
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

export function forgotPasswordSchema(t: Translator) {
  return z.object({ email: email(t) });
}
export type ForgotPasswordValues = z.infer<ReturnType<typeof forgotPasswordSchema>>;

/** token + email come from the URL, not the form. */
export function resetPasswordSchema(t: Translator) {
  return z.object({ password: newPassword(t) });
}
export type ResetPasswordValues = z.infer<ReturnType<typeof resetPasswordSchema>>;

export function acceptInvitationSchema(t: Translator) {
  return z.object({
    first_name: z.string().min(1, t("common.firstNameRequired")).max(100),
    last_name: z.string().min(1, t("common.lastNameRequired")).max(100),
    password: newPassword(t),
  });
}
export type AcceptInvitationValues = z.infer<ReturnType<typeof acceptInvitationSchema>>;

export function createBusinessSchema(t: Translator) {
  return z.object({
    name: z.string().min(1, t("common.businessNameRequired")).max(200),
  });
}
export type CreateBusinessValues = z.infer<ReturnType<typeof createBusinessSchema>>;
