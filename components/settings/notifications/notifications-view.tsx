"use client";

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

/** Every routable notification, in display order. Each card hides with its module. */
const SECTIONS: TeamNotificationSectionCopy[] = [
  {
    type: "new_lead",
    title: "New lead",
    description:
      "Sent when your AI assistant logs a lead on a call. Leads you add in the portal never trigger it.",
    defaultRecipient: "it goes to the lead's assignee, or the business owner when nobody is assigned.",
    noun: "lead",
    rulePlaceholders: [
      "Any appraisal or sales enquiry goes to bill@example.com",
      "Rental enquiries go to the property manager",
      "Don't email anyone about tenants asking for a rent receipt",
    ],
  },
  {
    type: "new_job",
    title: "New job",
    description:
      "Sent when your AI assistant logs or books a job on a call. Jobs you add in the portal never trigger it.",
    defaultRecipient: "it goes to the job's assignee, or the business owner when nobody is assigned.",
    noun: "job",
    rulePlaceholders: [
      "Plumbing jobs go to mick@example.com, electrical to dave@example.com",
      "Anything marked urgent also goes to the office",
      "Jobs in the northern suburbs go to the north team",
    ],
  },
  {
    type: "new_quote_request",
    title: "New quote request",
    description:
      "Sent when your AI assistant logs a quote request on a call, so it gets priced up. Quotes you create in the portal never trigger it.",
    defaultRecipient: "it goes to the business owner.",
    noun: "quote request",
    rulePlaceholders: [
      "Commercial quotes go to sales@example.com",
      "Anything under $500 goes to the office, larger jobs to the owner",
      "Quotes for existing customers go to their account manager",
    ],
  },
  {
    type: "team_callback_reminder",
    title: "Team callback reminder",
    description:
      "Sent shortly before a callback that someone on your team promised to make, so it isn't missed.",
    defaultRecipient: "it goes to the team member the callback is assigned to.",
    noun: "callback",
    rulePlaceholders: [
      "Callbacks about rentals go to the property manager, not the owner",
      "If the caller asked for a specific person, remind that person",
      "Send every reminder to the office inbox as well",
    ],
  },
];

export function NotificationsView() {
  const { business, modules } = useBusiness();
  const settingsQuery = useTeamNotificationSettings(business.id);

  const sections = SECTIONS.filter((section) =>
    modules.some((module) => module.key === TEAM_NOTIFICATION_MODULE[section.type] && module.enabled)
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Who on your team hears about what your AI assistant captures. Turn routing on for a notification and an assistant picks the recipients from your rules and their roles; off, each goes to its usual default."
      />

      {settingsQuery.isPending ? (
        <div className="flex max-w-3xl flex-col gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : settingsQuery.isError ? (
        <ErrorState
          title="Couldn't load notification settings"
          message={settingsQuery.error.message}
          onRetry={() => settingsQuery.refetch()}
        />
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None of the modules that send team notifications (leads, jobs, quotes, callbacks) are
          enabled for this business.
        </p>
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
