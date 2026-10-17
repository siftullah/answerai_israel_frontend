"use client";

import { useRouter } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthShell } from "@/components/auth/auth-shell";
import { RequireAuth, RequireVerified } from "@/components/auth/guards";
import { CreateBusinessDialog } from "@/components/business/create-business-dialog";
import { useLogout } from "@/hooks/use-auth-mutations";
import { avatarGradientClass } from "@/lib/avatar-gradient";
import { cn } from "@/lib/utils";
import { useMe } from "@/hooks/use-me";
import { setLastUsedBusiness } from "@/lib/business/last-used";

function ChooserContent() {
  const { data } = useMe();
  const router = useRouter();
  const logout = useLogout();

  if (!data) return null;

  const select = (uuid: string) => {
    setLastUsedBusiness(uuid);
    router.push(`/b/${uuid}`);
  };

  return (
    <AuthShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">Choose a business</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in as {data.user.email}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {data.memberships.map((membership) => (
            <button
              key={membership.id}
              type="button"
              onClick={() => select(membership.business.id)}
              className="group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left outline-none transition hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-135 text-base font-semibold text-white",
                  avatarGradientClass(membership.business.id)
                )}
              >
                {membership.business.name.charAt(0).toUpperCase()}
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{membership.business.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {membership.business.timezone}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {membership.business.status !== "active" && (
                  <Badge variant="outline">{membership.business.status}</Badge>
                )}
                <Badge variant="secondary">{membership.role.name}</Badge>
                <ChevronRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </span>
            </button>
          ))}

          {/* Creating additional businesses is intentionally not offered here;
              the card only appears for accounts with no business yet. */}
          {data.memberships.length === 0 && (
            <CreateBusinessDialog
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left outline-none transition hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <PlusIcon className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">Create a business</span>
                    <span className="text-xs text-muted-foreground">
                      Set up your business on AnswerAI
                    </span>
                  </span>
                </button>
              }
            />
          )}
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending && <Spinner />}
          Log out
        </Button>
      </div>
    </AuthShell>
  );
}

export function BusinessChooser() {
  return (
    <RequireAuth>
      <RequireVerified>
        <ChooserContent />
      </RequireVerified>
    </RequireAuth>
  );
}
