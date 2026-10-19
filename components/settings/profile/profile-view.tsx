"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import { AvatarCard } from "@/components/settings/profile/avatar-card";
import { PasswordForm } from "@/components/settings/profile/password-form";
import { ProfileDetailsForm } from "@/components/settings/profile/profile-details-form";
import { useMe } from "@/hooks/use-me";

export function ProfileView() {
  const t = useTranslations("settings.profile");
  const { business, membership } = useBusiness();
  const meQuery = useMe();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Landed here from the emailed email-change confirmation link.
  useEffect(() => {
    const status = searchParams.get("email_change");
    if (!status) return;
    if (status === "success") toast.success(t("toasts.emailConfirmed"));
    else toast.error(t("toasts.emailLinkInvalid"));
    router.replace(`/b/${business.id}/settings/profile`);
  }, [searchParams, router, business.id, t]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      {meQuery.isPending ? (
        <div className="flex max-w-3xl flex-col gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : meQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={meQuery.error.message}
          onRetry={() => meQuery.refetch()}
        />
      ) : (
        <div className="flex max-w-3xl flex-col gap-6">
          <AvatarCard avatar={meQuery.data.user.avatar} />
          <ProfileDetailsForm user={meQuery.data.user} membership={membership} />
          <PasswordForm />
        </div>
      )}
    </div>
  );
}
