import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerifyEmailScreen } from "@/components/auth/verify-email-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verifyEmail.meta.title") };
}

export default function VerifyEmailPage() {
  return <VerifyEmailScreen />;
}
