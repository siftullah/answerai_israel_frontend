"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import {
  contactDisplayName,
  contactInitial,
  primaryEmail,
  primaryPhone,
} from "@/components/contacts/contact-display";
import { ContactRowActions } from "@/components/contacts/contact-row-actions";
import { SourceBadge } from "@/components/contacts/source-badge";
import type { Contact } from "@/lib/api/types";
import { avatarGradientClass } from "@/lib/avatar-gradient";
import { formatDate } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

export interface ContactListSelection {
  isSelected: (id: string) => boolean;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  headerChecked: boolean;
  headerIndeterminate: boolean;
}

export function ContactsTable({
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
  const tc = useTranslations("common");

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label={t("list.selectAllLoaded")}
                checked={selection.headerChecked}
                indeterminate={selection.headerIndeterminate}
                onCheckedChange={selection.onToggleAll}
              />
            </TableHead>
            <TableHead>{tc("labels.name")}</TableHead>
            <TableHead>{tc("labels.phone")}</TableHead>
            <TableHead>{tc("labels.email")}</TableHead>
            <TableHead>{t("fields.tags")}</TableHead>
            <TableHead>{t("fields.source")}</TableHead>
            <TableHead>{t("fields.lastCall")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const phone = primaryPhone(contact);
            const email = primaryEmail(contact);
            return (
              <TableRow key={contact.id}>
                <TableCell>
                  <Checkbox
                    aria-label={t("selectContact", { name: contactDisplayName(contact) })}
                    checked={selection.isSelected(contact.id)}
                    onCheckedChange={() => selection.onToggleRow(contact.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-medium text-white ${avatarGradientClass(contact.id)}`}
                    >
                      {contactInitial(contact)}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/b/${businessUuid}/contacts/${contact.id}`}
                          className="max-w-52 truncate font-medium hover:underline"
                        >
                          {contactDisplayName(contact)}
                        </Link>
                        {contact.on_dnc && <Badge variant="destructive">{t("onDnc")}</Badge>}
                      </div>
                      {contact.name && contact.company && (
                        <span className="max-w-52 truncate text-sm font-normal text-muted-foreground">
                          {contact.company}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {phone ? formatE164(phone.e164) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span className="block max-w-48 truncate">{email ?? "—"}</span>
                </TableCell>
                <TableCell>
                  {contact.tags.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 2 && (
                        <Badge variant="ghost">+{contact.tags.length - 2}</Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <SourceBadge source={contact.source} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {contact.last_call_at ? formatDate(contact.last_call_at, timeZone) : "—"}
                </TableCell>
                <TableCell>
                  <ContactRowActions
                    contact={contact}
                    businessUuid={businessUuid}
                    onEdit={() => onEdit(contact)}
                    onAddToDnc={onAddToDnc}
                    onDelete={() => onDelete(contact)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
