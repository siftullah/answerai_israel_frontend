"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  contactDisplayName,
  contactInitial,
  primaryEmail,
  primaryPhone,
} from "@/components/contacts/contact-display";
import { ContactRowActions } from "@/components/contacts/contact-row-actions";
import { SourceBadge } from "@/components/contacts/source-badge";
import type { ContactListSelection } from "@/components/contacts/contacts-table";
import type { Contact } from "@/lib/api/types";
import { avatarGradientClass } from "@/lib/avatar-gradient";
import { formatDate } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

export function ContactsCards({
  contacts,
  businessUuid,
  timeZone,
  selection,
  onEdit,
  onAddToDnc,
  onDelete,
}: {
  contacts: Contact[];
  businessUuid: string;
  timeZone: string;
  selection: ContactListSelection;
  onEdit: (contact: Contact) => void;
  onAddToDnc: (e164: string) => void;
  onDelete: (contact: Contact) => void;
}) {
  const t = useTranslations("contacts");

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {contacts.map((contact) => {
        const phone = primaryPhone(contact);
        const email = primaryEmail(contact);
        return (
          <div
            key={contact.id}
            className="relative flex flex-col gap-3 rounded-2xl border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  aria-hidden
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-medium text-white ${avatarGradientClass(contact.id)}`}
                >
                  {contactInitial(contact)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/b/${businessUuid}/contacts/${contact.id}`}
                      className="truncate font-medium after:absolute after:inset-0 after:rounded-2xl"
                    >
                      {contactDisplayName(contact)}
                    </Link>
                    {contact.on_dnc && (
                      <Badge variant="destructive" className="relative z-10">
                        {t("onDnc")}
                      </Badge>
                    )}
                  </div>
                  {contact.name && contact.company && (
                    <p className="truncate text-sm text-muted-foreground">{contact.company}</p>
                  )}
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1">
                <Checkbox
                  aria-label={t("selectContact", { name: contactDisplayName(contact) })}
                  checked={selection.isSelected(contact.id)}
                  onCheckedChange={() => selection.onToggleRow(contact.id)}
                />
                <ContactRowActions
                  contact={contact}
                  businessUuid={businessUuid}
                  onEdit={() => onEdit(contact)}
                  onAddToDnc={onAddToDnc}
                  onDelete={() => onDelete(contact)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="truncate tabular-nums">
                {phone ? formatE164(phone.e164) : t("list.noPhone")}
              </span>
              {email && <span className="truncate">{email}</span>}
            </div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {contact.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
                {contact.tags.length > 3 && (
                  <Badge variant="ghost">+{contact.tags.length - 3}</Badge>
                )}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between border-t pt-3">
              <SourceBadge source={contact.source} />
              <span className="text-sm text-muted-foreground">
                {contact.last_call_at
                  ? t("list.lastCallOn", { date: formatDate(contact.last_call_at, timeZone) })
                  : t("noCallsYet")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
