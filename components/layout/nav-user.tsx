"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BuildingIcon, ChevronsUpDownIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useBusiness } from "@/components/business/business-provider";
import { useLogout } from "@/hooks/use-auth-mutations";
import { useMe } from "@/hooks/use-me";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Sidebar-footer account menu. The trigger's second line carries the current
 * business name — tenancy is shown here rather than in a chrome switcher;
 * switching is just a link to the /select-business chooser.
 */
export function NavUser() {
  const { data } = useMe();
  const { business } = useBusiness();
  const { isMobile } = useSidebar();
  const logout = useLogout();
  const router = useRouter();
  const t = useTranslations("layout");
  const tc = useTranslations("common");

  if (!data) return null;
  const { user } = data;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-sidebar-accent" />}
          >
            <Avatar className="size-9 rounded-lg">
              {user.avatar && (
                <AvatarImage src={user.avatar.url} alt={user.name} className="rounded-lg" />
              )}
              <AvatarFallback className="rounded-lg bg-sidebar-primary font-medium text-sidebar-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{business.name}</span>
            </div>
            <ChevronsUpDownIcon className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 space-y-1.5 pb-2.5"
            side={isMobile ? "bottom" : "inline-end"}
            align="end"
            sideOffset={4}
          >
            {/* Base UI: GroupLabel must live inside a Group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="size-9 rounded-lg">
                    {user.avatar && (
                      <AvatarImage src={user.avatar.url} alt={user.name} className="rounded-lg" />
                    )}
                    <AvatarFallback className="rounded-lg bg-brand-blue font-medium text-white">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(`/b/${business.id}/settings/profile`)}>
              <SettingsIcon />
              {tc("labels.settings")}
            </DropdownMenuItem>
            {data.memberships.length > 1 && (
              <DropdownMenuItem onClick={() => router.push("/select-business")}>
                <BuildingIcon />
                {t("navUser.switchBusiness")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOutIcon />
              {tc("actions.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
