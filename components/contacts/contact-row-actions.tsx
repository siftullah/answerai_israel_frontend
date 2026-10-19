"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  PhoneOffIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { contactDisplayName, primaryPhone } from "@/components/contacts/contact-display";
import type { Contact } from "@/lib/api/types";

/** Kebab shared by the table row and the card. */
export function ContactRowActions({
  contact,
  businessUuid,
  onEdit,
  onAddToDnc,
  onDelete,
}: {
  contact: Contact;
  businessUuid: string;
  onEdit: () => void;
  onAddToDnc: (e164: string) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const phone = primaryPhone(contact);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("actionsFor", { name: contactDisplayName(contact) })}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/b/${businessUuid}/contacts/${contact.id}`} />}>
          <EyeIcon />
          {tc("actions.open")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          {tc("actions.edit")}
        </DropdownMenuItem>
        {/* Phone-less contacts have nothing to block. */}
        {phone && !contact.on_dnc && (
          <DropdownMenuItem onClick={() => onAddToDnc(phone.e164)}>
            <PhoneOffIcon />
            {t("addToDnc")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          {tc("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
