"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, UserRoundPlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { QuickCreateContactDialog } from "@/components/contacts/quick-create-contact-dialog";
import { useContactsInfinite } from "@/hooks/use-contacts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/api/types";

/**
 * Server-searched contact picker (the backend's LIKE search does the
 * filtering, hence shouldFilter={false}). Phone-less contacts are disabled by
 * default — a callback needs a number to dial — but appointment booking passes
 * requirePhone={false}; DNC contacts stay selectable (the backend allows it)
 * but are flagged here and advised on in the parent form. allowCreate adds a
 * quick-create path so raising a quote/invoice for someone new never detours
 * through the Contacts page.
 */
export function ContactCombobox({
  selected,
  onSelect,
  invalid,
  id,
  requirePhone = true,
  allowCreate = false,
}: {
  selected: Contact | null;
  onSelect: (contact: Contact) => void;
  invalid?: boolean;
  id?: string;
  requirePhone?: boolean;
  allowCreate?: boolean;
}) {
  const { business } = useBusiness();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const q = useDebouncedValue(search, 300).trim();

  const query = useContactsInfinite(business.id, q ? { q } : {});
  const contacts = query.data?.pages.flatMap((page) => page.data) ?? [];

  const createItem = allowCreate ? (
    <CommandItem
      value="__create__"
      // cmdk keeps filtering off, so this stays visible for any search.
      onSelect={() => {
        setOpen(false);
        setCreating(true);
      }}
      className="border-t border-border text-primary data-[selected=true]:text-primary"
    >
      <UserRoundPlusIcon className="shrink-0" />
      {q ? `New contact "${q}"` : "New contact"}
    </CommandItem>
  ) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground"
            )}
          />
        }
      >
        <span className="min-w-0 truncate">
          {selected ? (selected.name ?? formatE164(selected.phones[0]?.e164 ?? "")) : "Choose a contact"}
        </span>
        <ChevronsUpDownIcon className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search contacts…"
          />
          <CommandList>
            {query.isPending ? (
              <div className="flex justify-center py-6">
                <Spinner className="size-4" />
              </div>
            ) : contacts.length === 0 ? (
              <>
                <CommandEmpty>No contacts match.</CommandEmpty>
                {createItem}
              </>
            ) : (
              <>
                {contacts.map((contact) => {
                  const phone = contact.phones.find((p) => p.primary) ?? contact.phones[0];
                  return (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      disabled={requirePhone && !phone}
                      onSelect={() => {
                        onSelect(contact);
                        setOpen(false);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2">
                          <span className="min-w-0 truncate font-medium">
                            {contact.name ?? (phone ? formatE164(phone.e164) : "Unnamed contact")}
                          </span>
                          {contact.on_dnc && (
                            <Badge variant="warning" className="h-5 shrink-0">
                              On DNC
                            </Badge>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {phone
                            ? [
                                contact.name ? formatE164(phone.e164) : null,
                                contact.company,
                              ]
                                .filter(Boolean)
                                .join(" · ") || formatE164(phone.e164)
                            : "No phone number"}
                        </span>
                      </div>
                      {selected?.id === contact.id && <CheckIcon className="shrink-0" />}
                    </CommandItem>
                  );
                })}
                {query.hasNextPage && (
                  <CommandItem
                    value="__load_more__"
                    onSelect={() => void query.fetchNextPage()}
                    className="justify-center text-sm text-muted-foreground"
                  >
                    {query.isFetchingNextPage ? <Spinner className="size-4" /> : "Load more"}
                  </CommandItem>
                )}
                {createItem}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>

      {creating && (
        <QuickCreateContactDialog
          open
          initialName={q}
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onCreated={(contact) => {
            onSelect(contact);
            setSearch("");
          }}
        />
      )}
    </Popover>
  );
}
