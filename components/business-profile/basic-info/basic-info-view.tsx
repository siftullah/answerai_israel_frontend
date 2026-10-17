"use client";

import { useState } from "react";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import { ExtractionDialog } from "@/components/business-profile/extraction/extraction-dialog";
import { BusinessDetailsCard } from "@/components/business-profile/basic-info/business-details-card";
import { LogoCard } from "@/components/business-profile/basic-info/logo-card";
import { ProfileForm } from "@/components/business-profile/basic-info/profile-form";
import { useBusinessProfile } from "@/hooks/use-business-profile";
import type { BasicInfoDraft } from "@/lib/api/types";

export function BasicInfoView() {
  const { business } = useBusiness();
  const profileQuery = useBusinessProfile(business.id);
  const [draft, setDraft] = useState<BasicInfoDraft | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Basic info"
        description="Contact details, description, location and logo your AI can share."
        actions={
          <ExtractionDialog
            target="basic_info"
            title="Extract basic info"
            description="Pull contact details, description, socials and location from your website or a document. You review everything before saving."
            onReady={(extraction) => setDraft(extraction.draft as BasicInfoDraft)}
          />
        }
      />

      {profileQuery.isPending ? (
        <div className="flex max-w-3xl flex-col gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : profileQuery.isError ? (
        <ErrorState
          title="Couldn't load your business profile"
          message={profileQuery.error.message}
          onRetry={() => profileQuery.refetch()}
        />
      ) : (
        <div className="flex max-w-3xl flex-col gap-6">
          <BusinessDetailsCard />
          <LogoCard businessUuid={business.id} logo={profileQuery.data.logo} />
          <ProfileForm
            businessUuid={business.id}
            profile={profileQuery.data}
            draft={draft}
            onDraftHandled={() => setDraft(null)}
          />
        </div>
      )}
    </div>
  );
}
