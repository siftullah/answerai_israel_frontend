import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AcceptInvitationFlow } from "@/components/auth/accept-invitation-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("acceptInvitation.meta.title") };
}

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <AcceptInvitationFlow />
    </Suspense>
  );
}
