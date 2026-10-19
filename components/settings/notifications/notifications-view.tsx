"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import {
  TeamNotificationCard,
  type TeamNotificationSectionCopy,
} from "@/components/settings/notifications/team-notification-card";
import { useTeamNotificationSettings } from "@/hooks/use-team-notification-settings";
import { TEAM_NOTIFICATION_MODULE } from "@/lib/api/types";

export function NotificationsView() {
  const t = useTranslations("settings.notifications");
  const { business, modules } = useBusiness();
  const settingsQuery = useTeamNotificationSettings(business.id);

  /**
   * Every routable notification, in display order. Each card hides with its
   * module. Sentences are spelled out per notification (not built from a noun)
   * so translations can agree in gender and number.
   */
  const allSections: TeamNotificationSectionCopy[] = [
    {
      type: "new_lead",
      title: t("sections.newLead.title"),
      description: t("sections.newLead.description"),
      enabledDescription: t("sections.newLead.enabledDescription"),
      recipientsDescription: t("sections.newLead.recipientsDescription"),
      rulesDescription: t("sections.newLead.rulesDescription"),
      rulesEmpty: t("sections.newLead.rulesEmpty"),
      testLabel: t("sections.newLead.testLabel"),
      testNobody: t("sections.newLead.testNobody"),
      rulePlaceholders: [
        t("sections.newLead.rulePlaceholders.first"),
        t("sections.newLead.rulePlaceholders.second"),
        t("sections.newLead.rulePlaceholders.third"),
      ],
    },
    {
      type: "new_job",
      title: t("sections.newJob.title"),
      description: t("sections.newJob.description"),
      enabledDescription: t("sections.newJob.enabledDescription"),
      recipientsDescription: t("sections.newJob.recipientsDescription"),
      rulesDescription: t("sections.newJob.rulesDescription"),
      rulesEmpty: t("sections.newJob.rulesEmpty"),
      testLabel: t("sections.newJob.testLabel"),
      testNobody: t("sections.newJob.testNobody"),
      rulePlaceholders: [
        t("sections.newJob.rulePlaceholders.first"),
        t("sections.newJob.rulePlaceholders.second"),
        t("sections.newJob.rulePlaceholders.third"),
      ],
    },
    {
      type: "new_quote_request",
      title: t("sections.newQuoteRequest.title"),
      description: t("sections.newQuoteRequest.description"),
      enabledDescription: t("sections.newQuoteRequest.enabledDescription"),
      recipientsDescription: t("sections.newQuoteRequest.recipientsDescription"),
      rulesDescription: t("sections.newQuoteRequest.rulesDescription"),
      rulesEmpty: t("sections.newQuoteRequest.rulesEmpty"),
      testLabel: t("sections.newQuoteRequest.testLabel"),
      testNobody: t("sections.newQuoteRequest.testNobody"),
      rulePlaceholders: [
        t("sections.newQuoteRequest.rulePlaceholders.first"),
        t("sections.newQuoteRequest.rulePlaceholders.second"),
        t("sections.newQuoteRequest.rulePlaceholders.third"),
      ],
    },
    {
      type: "team_callback_reminder",
      title: t("sections.teamCallbackReminder.title"),
      description: t("sections.teamCallbackReminder.description"),
      enabledDescription: t("sections.teamCallbackReminder.enabledDescription"),
      recipientsDescription: t("sections.teamCallbackReminder.recipientsDescription"),
      rulesDescription: t("sections.teamCallbackReminder.rulesDescription"),
      rulesEmpty: t("sections.teamCallbackReminder.rulesEmpty"),
      testLabel: t("sections.teamCallbackReminder.testLabel"),
      testNobody: t("sections.teamCallbackReminder.testNobody"),
      rulePlaceholders: [
        t("sections.teamCallbackReminder.rulePlaceholders.first"),
        t("sections.teamCallbackReminder.rulePlaceholders.second"),
        t("sections.teamCallbackReminder.rulePlaceholders.third"),
      ],
    },
  ];

  const sections = allSections.filter((section) =>
    modules.some((module) => module.key === TEAM_NOTIFICATION_MODULE[section.type] && module.enabled)
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      {settingsQuery.isPending ? (
        <div className="flex max-w-3xl flex-col gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : settingsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={settingsQuery.error.message}
          onRetry={() => settingsQuery.refetch()}
        />
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noModules")}</p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-6">
          {sections.map((section) => {
            const settings = settingsQuery.data.find((item) => item.type === section.type);
            if (!settings) return null;
            return (
              <TeamNotificationCard
                key={section.type}
                businessUuid={business.id}
                settings={settings}
                copy={section}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
