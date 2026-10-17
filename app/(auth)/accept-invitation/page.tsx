import type { Metadata } from "next";
import { Suspense } from "react";
import { AcceptInvitationFlow } from "@/components/auth/accept-invitation-flow";

export const metadata: Metadata = { title: "Accept invitation" };

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <AcceptInvitationFlow />
    </Suspense>
  );
}
