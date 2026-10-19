"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { roleLabel } from "@/components/business-profile/team/role-label";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateInvitation } from "@/hooks/use-invitations";
import { useRoles } from "@/hooks/use-roles";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { BusinessMember } from "@/lib/api/types";
import { inviteSchema, type InviteValues } from "@/lib/validation/member";

/**
 * Invites an existing account-less member to create an account — their
 * email/phone come from the member row; acceptance attaches the new
 * account to it.
 */
export function InviteDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: BusinessMember;
}) {
  const t = useTranslations("businessProfile.invite");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const rolesQuery = useRoles(business.id);
  const create = useCreateInvitation(business.id);

  const assignableRoles = (rolesQuery.data ?? []).filter((role) => role.slug !== "owner");

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows the role's uuid.
  const roleItems = assignableRoles.map((role) => ({
    value: role.id,
    label: roleLabel(role) ?? role.name,
  }));
  const defaultRoleId =
    member.role && member.role.slug !== "owner"
      ? member.role.id
      : (assignableRoles.find((role) => role.slug === "member")?.id ?? "");

  const tv = useTranslations("validation");
  const schema = useMemo(() => inviteSchema(tv), [tv]);
  const form = useForm<InviteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role_id: defaultRoleId,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      { member_id: member.id, role_id: values.role_id },
      {
        onSuccess: () => {
          toast.success(t("toasts.sent"));
          onOpenChange(false);
        },
        onError: (error) => applyServerErrors(form, error),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: member.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="invite-email">{tc("labels.email")}</FieldLabel>
            <Input id="invite-email" type="email" value={member.email ?? ""} disabled />
          </Field>

          <Field data-invalid={!!errors.role_id || undefined}>
            <FieldLabel htmlFor="invite-role">{t("role")}</FieldLabel>
            <Controller
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <Select
                  items={roleItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue placeholder={t("chooseRole")} />
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
            {errors.role_id && <FieldError>{errors.role_id.message}</FieldError>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              {t("send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
