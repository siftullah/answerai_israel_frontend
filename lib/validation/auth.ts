import { z } from "zod";

const email = z.email("Enter a valid email address");
const newPassword = z.string().min(8, "Password must be at least 8 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email,
  password: newPassword,
  business_name: z.string().min(1, "Business name is required").max(200),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** token + email come from the URL, not the form. */
export const resetPasswordSchema = z.object({ password: newPassword });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const acceptInvitationSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  password: newPassword,
});
export type AcceptInvitationValues = z.infer<typeof acceptInvitationSchema>;

export const createBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required").max(200),
});
export type CreateBusinessValues = z.infer<typeof createBusinessSchema>;
