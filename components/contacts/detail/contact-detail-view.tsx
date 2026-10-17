"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PhoneIcon,
  PhoneOffIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { PlaceCallDialog } from "@/components/calls/place-call-dialog";
import {
  contactDisplayName,
  contactInitial,
  primaryPhone,
} from "@/components/contacts/contact-display";
import { ContactEditorDialog } from "@/components/contacts/contact-editor-dialog";
import { AddDncDialog } from "@/components/contacts/dnc/add-dnc-dialog";
import { SourceBadge } from "@/components/contacts/source-badge";
import { ContactActivity } from "@/components/contacts/detail/contact-activity";
import { ContactProfileCard } from "@/components/contacts/detail/contact-profile-card";
import { useContact, useDeleteContact } from "@/hooks/use-contacts";
import type { Contact } from "@/lib/api/types";
import { avatarGradientClass } from "@/lib/avatar-gradient";
import { formatE164 } from "@/lib/phone";

export function ContactDetailView() {
  const { contactUuid } = useParams<{ businessUuid: string; contactUuid: string }>();
  const { business } = useBusiness();
  const contactQuery = useContact(business.id, contactUuid);

  const listHref = `/b/${business.id}/contacts`;

  if (contactQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (contactQuery.isError) {
    const notFound = contactQuery.error.status === 404;
    return (
      <div className="flex flex-col items-start gap-4">
        <Button variant="ghost" size="sm" render={<Link href={listHref} />}>
          <ArrowLeftIcon />
          Contacts
        </Button>
        <ErrorState
          title={notFound ? "Contact not found" : "Couldn't load this contact"}
          message={
            notFound
              ? "This contact doesn't exist or was deleted."
              : contactQuery.error.message
          }
          onRetry={notFound ? undefined : () => contactQuery.refetch()}
        />
      </div>
    );
  }

  return <ContactDetailBody key={contactQuery.data.id} contact={contactQuery.data} />;
}

function ContactDetailBody({ contact }: { contact: Contact }) {
  const { business } = useBusiness();
  const router = useRouter();
  const deleteContact = useDeleteContact(business.id);

  const [editing, setEditing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addingToDnc, setAddingToDnc] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const listHref = `/b/${business.id}/contacts`;
  const phone = primaryPhone(contact);
  const name = contactDisplayName(contact);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div
            aria-hidden
            className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-medium text-white ${avatarGradientClass(contact.id)}`}
          >
            {contactInitial(contact)}
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="max-w-full truncate font-heading text-2xl font-semibold">
                {name}
              </h1>
              {contact.on_dnc && <Badge variant="destructive">On DNC</Badge>}
              <SourceBadge source={contact.source} />
            </div>
            {contact.name && contact.company && (
              <p className="truncate text-muted-foreground">{contact.company}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" render={<Link href={listHref} />}>
            <ArrowLeftIcon />
            Back
          </Button>
          <Button onClick={() => setEditing(true)}>
            <PencilIcon />
            Edit
          </Button>
          <Button variant="cta" disabled={!phone} onClick={() => setPlacing(true)}>
            <PhoneIcon />
            Call
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={`More actions for ${name}`} />
              }
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {phone && !contact.on_dnc && (
                <DropdownMenuItem onClick={() => setAddingToDnc(true)}>
                  <PhoneOffIcon />
                  Add to DNC
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ContactProfileCard contact={contact} timeZone={business.timezone} />
        <ContactActivity contact={contact} />
      </div>

      <PlaceCallDialog
        open={placing}
        onOpenChange={setPlacing}
        contact={contact}
        defaults={{
          ...(phone ? { to_number: formatE164(phone.e164) } : {}),
          contact_id: contact.id,
        }}
        onPlaced={(call) => router.push(`/b/${business.id}/calls/${call.id}`)}
      />

      {editing && (
        <ContactEditorDialog
          open
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
          source={contact}
        />
      )}

      {addingToDnc && phone && (
        <AddDncDialog
          open
          onOpenChange={(next) => {
            if (!next) setAddingToDnc(false);
          }}
          prefill={{ e164: phone.e164 }}
        />
      )}

      <AlertDialog
        open={confirmingDelete}
        onOpenChange={(next) => {
          if (!next) setConfirmingDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from your contact book. Past call logs keep their name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteContact.mutate(contact.id, {
                  onSuccess: () => {
                    toast.success("Contact deleted");
                    router.push(listHref);
                  },
                  onError: (error) => toast.error(error.message),
                });
                setConfirmingDelete(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
