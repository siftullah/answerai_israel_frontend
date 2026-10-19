"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/contacts/source-badge";
import type { Contact } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function ContactProfileCard({
  contact,
  timeZone,
}: {
  contact: Contact;
  timeZone: string;
}) {
  const t = useTranslations("contacts");
  const phoneLabels: Record<string, string> = {
    mobile: t("phoneLabels.mobile"),
    work: t("phoneLabels.work"),
    home: t("phoneLabels.home"),
    other: t("phoneLabels.other"),
  };

  return (
    <div className="flex h-fit flex-col gap-5 rounded-2xl border bg-card p-5">
      <Section title={t("fields.phoneNumbers")}>
        {contact.phones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("detail.noPhones")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contact.phones.map((phone) => (
              <li key={phone.e164} className="flex items-center gap-2 text-sm">
                <span className="tabular-nums">{formatE164(phone.e164)}</span>
                {phone.label && (
                  <span className="text-muted-foreground">
                    {phoneLabels[phone.label] ?? phone.label}
                  </span>
                )}
                {phone.primary && contact.phones.length > 1 && (
                  <Badge variant="ghost">{t("primary")}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("fields.emails")}>
        {contact.emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("detail.noEmails")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contact.emails.map((email) => (
              <li key={email.email} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate">{email.email}</span>
                {email.label && <span className="shrink-0 text-muted-foreground">{email.label}</span>}
                {email.primary && contact.emails.length > 1 && (
                  <Badge variant="ghost" className="shrink-0">
                    {t("primary")}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {contact.address && (
        <Section title={t("fields.address")}>
          <p className="text-sm whitespace-pre-line">{contact.address}</p>
        </Section>
      )}

      {contact.tags.length > 0 && (
        <Section title={t("fields.tags")}>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      <div className="flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>{t("fields.source")}</span>
          <SourceBadge source={contact.source} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>{t("fields.lastCall")}</span>
          <span>
            {contact.last_call_at ? formatDateTime(contact.last_call_at, timeZone) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>{t("fields.added")}</span>
          <span>{formatDate(contact.created_at, timeZone)}</span>
        </div>
      </div>
    </div>
  );
}
