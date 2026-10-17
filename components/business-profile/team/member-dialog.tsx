"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { WeeklyHoursEditor } from "@/components/business-profile/weekly-hours-editor";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateInvitation } from "@/hooks/use-invitations";
import { useCreateMember, useUpdateMember } from "@/hooks/use-members";
import { useRoles } from "@/hooks/use-roles";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { BusinessMember } from "@/lib/api/types";
import {
  memberSchema,
  memberServerFieldKey,
  toMemberValues,
  toStoreMemberPayload,
  toUpdateMemberPayload,
  type MemberValues,
} from "@/lib/validation/member";

/**
 * Add/edit a team member. New members are directory-only (no login)
 * unless "Send invite to create account" is ticked, which chains an
 * account invitation onto the freshly created member.
 */
export function MemberDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: BusinessMember | null;
}) {
  const { business } = useBusiness();
  const rolesQuery = useRoles(business.id);
  const create = useCreateMember(business.id);
  const update = useUpdateMember(business.id);
  const createInvitation = useCreateInvitation(business.id);
  const [sendInvite, setSendInvite] = useState(false);

  const isOwner = member?.role?.slug === "owner";
  const accountLocked = Boolean(member?.has_account);

  const form = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: toMemberValues(member),
  });
  const { errors } = form.formState;
  const hoursMode = form.watch("hours_mode");

  const assignableRoles = (rolesQuery.data ?? []).filter((role) => role.slug !== "owner");

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows "default" or the role's uuid.
  // While roles load, the member's own role object seeds its label so editing
  // e.g. an Admin never flashes the uuid.
  const savedRole = member?.role;
  const roleItems = isOwner
    ? [{ value: "default", label: "Owner" }]
    : [
        { value: "default", label: "Member (default)" },
        ...(rolesQuery.data
          ? assignableRoles
              .filter((role) => role.slug !== "member")
              .map((role) => ({ value: role.id, label: role.name }))
          : savedRole && savedRole.slug !== "owner" && savedRole.slug !== "member"
            ? [{ value: savedRole.id, label: savedRole.name }]
            : []),
      ];

  const onSubmit = form.handleSubmit((values) => {
    if (member) {
      update.mutate(
        { id: member.id, payload: toUpdateMemberPayload(values, { accountLocked, isOwner }) },
        {
          onSuccess: () => {
            toast.success("Member saved");
            onOpenChange(false);
          },
          onError: (error) =>
            applyServerErrors(form, error, { mapKey: memberServerFieldKey }),
        }
      );
    } else {
      create.mutate(toStoreMemberPayload(values), {
        onSuccess: (created) => {
          if (!sendInvite) {
            toast.success("Member added");
            onOpenChange(false);
            return;
          }

          // Invitations always need an explicit role — resolve the
          // default choice to the business's member role.
          const inviteRoleId =
            values.role_id !== ""
              ? values.role_id
              : (rolesQuery.data ?? []).find((role) => role.slug === "member")?.id;

          // The member now exists either way, so a failed invitation
          // closes the dialog too — resubmitting would trip the email
          // uniqueness check. The row's "Invite to create account"
          // action is the retry path.
          const inviteFailed = (description: string) => {
            toast.warning("Member added, but the invitation couldn't be sent", {
              description,
            });
            onOpenChange(false);
          };

          if (!inviteRoleId) {
            inviteFailed('Use "Invite to create account" on the member to retry.');
            return;
          }

          createInvitation.mutate(
            { member_id: created.id, role_id: inviteRoleId },
            {
              onSuccess: () => {
                toast.success("Member added and invitation sent");
                onOpenChange(false);
              },
              onError: (error) => inviteFailed(error.message),
            }
          );
        },
        onError: (error) =>
          applyServerErrors(form, error, { mapKey: memberServerFieldKey }),
      });
    }
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title={member ? "Edit member" : "Add member"}
        description={
          member
            ? accountLocked
              ? "Name and email are managed by the member's account."
              : "Directory details for this member."
            : "Add someone to your team directory — optionally invite them to create a login."
        }
        onSubmit={onSubmit}
        submitLabel={member ? "Save changes" : sendInvite ? "Add & send invite" : "Add member"}
        pending={create.isPending || update.isPending || createInvitation.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: "Details",
            fields: ["first_name", "last_name", "email", "phone_e164", "position", "role_id"],
            content: (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={!!errors.first_name || undefined}>
                    <FieldLabel htmlFor="member-first-name">First name</FieldLabel>
                    <Input
                      id="member-first-name"
                      placeholder="Sam"
                      autoComplete="off"
                      disabled={accountLocked}
                      aria-invalid={!!errors.first_name}
                      {...form.register("first_name")}
                    />
                    {errors.first_name && <FieldError>{errors.first_name.message}</FieldError>}
                  </Field>
                  <Field data-invalid={!!errors.last_name || undefined}>
                    <FieldLabel htmlFor="member-last-name">Last name</FieldLabel>
                    <Input
                      id="member-last-name"
                      placeholder="Rivera"
                      autoComplete="off"
                      disabled={accountLocked}
                      aria-invalid={!!errors.last_name}
                      {...form.register("last_name")}
                    />
                    {errors.last_name && <FieldError>{errors.last_name.message}</FieldError>}
                  </Field>
                </div>

                <Field data-invalid={!!errors.email || undefined}>
                  <FieldLabel htmlFor="member-email">Email</FieldLabel>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="sam@yourbusiness.com.au"
                    autoComplete="off"
                    disabled={accountLocked}
                    aria-invalid={!!errors.email}
                    {...form.register("email")}
                  />
                  {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={!!errors.phone_e164 || undefined}>
                    <FieldLabel htmlFor="member-phone">Phone</FieldLabel>
                    <Input
                      id="member-phone"
                      type="tel"
                      placeholder="0412 345 678"
                      autoComplete="off"
                      aria-invalid={!!errors.phone_e164}
                      {...form.register("phone_e164")}
                    />
                    {errors.phone_e164 && <FieldError>{errors.phone_e164.message}</FieldError>}
                  </Field>
                  <Field data-invalid={!!errors.position || undefined}>
                    <FieldLabel htmlFor="member-position">Position</FieldLabel>
                    <Input
                      id="member-position"
                      placeholder="Site manager"
                      autoComplete="off"
                      aria-invalid={!!errors.position}
                      {...form.register("position")}
                    />
                    {errors.position && <FieldError>{errors.position.message}</FieldError>}
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="member-role">Role</FieldLabel>
                  <Controller
                    control={form.control}
                    name="role_id"
                    render={({ field }) => (
                      <Select
                        items={roleItems}
                        value={field.value || "default"}
                        onValueChange={(value) =>
                          field.onChange(
                            value === "default" || value === null ? "" : (value as string)
                          )
                        }
                        disabled={isOwner || rolesQuery.isPending}
                      >
                        <SelectTrigger id="member-role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                {!member && (
                  <FieldLabel htmlFor="member-send-invite">
                    <Field orientation="horizontal">
                      <Checkbox
                        id="member-send-invite"
                        checked={sendInvite}
                        onCheckedChange={(checked) => setSendInvite(checked === true)}
                      />
                      <FieldContent>
                        <FieldTitle>Send invite to create account</FieldTitle>
                        <FieldDescription>
                          They&apos;ll get an email link to create their login, connected to
                          this member.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                )}
              </>
            ),
          },
          {
            title: "Availability",
            fields: ["hours_mode", "calling_hours"],
            content: (
              <>
                <div>
                  <p className="text-base font-medium">Calling availability</p>
                  <p className="text-sm text-muted-foreground">
                    When your AI can transfer calls to this member.
                  </p>
                </div>

                <Controller
                  control={form.control}
                  name="hours_mode"
                  render={({ field }) => (
                    <ChoiceCards
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        {
                          value: "inherit",
                          label: "Business hours",
                          description: "Same as your business trading hours.",
                        },
                        {
                          value: "custom",
                          label: "Custom hours",
                          description: "Set specific days and times for this member.",
                        },
                      ]}
                    />
                  )}
                />

                {hoursMode === "custom" && (
                  <>
                    <Controller
                      control={form.control}
                      name="calling_hours"
                      render={({ field }) => (
                        <WeeklyHoursEditor value={field.value} onChange={field.onChange} />
                      )}
                    />
                    {errors.calling_hours && (
                      <FieldError>{errors.calling_hours.message as string}</FieldError>
                    )}
                  </>
                )}
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
