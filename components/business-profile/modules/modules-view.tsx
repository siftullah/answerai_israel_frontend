"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { ModuleSettingsSection } from "@/components/business-profile/modules/module-settings-section";
import { useUpdateModules } from "@/hooks/use-modules";
import { toolLabel } from "@/lib/agents/tool-catalog";
import { MODULE_CATALOG } from "@/lib/modules/catalog";
import type { BusinessModule, ModuleKey } from "@/lib/api/types";

export function ModulesView() {
  const t = useTranslations("businessProfile.modules");
  const tc = useTranslations("common");
  const { business, membership, modules } = useBusiness();

  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";

  const update = useUpdateModules(business.id);

  // The row being changed — only it shows a spinner, but every switch locks
  // while a sync is in flight (the endpoint takes the whole set, so two
  // crossing requests would clobber each other).
  const [pendingKey, setPendingKey] = useState<ModuleKey | null>(null);
  const [confirming, setConfirming] = useState<BusinessModule | null>(null);

  // Defence-in-depth: the section rail hides this for members, but a deep
  // link shouldn't reach the switches either (the API refuses them anyway).
  if (!privileged) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t("notAvailable.title")}</CardTitle>
            <CardDescription>
              {t("notAvailable.description")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const apply = (key: ModuleKey, next: boolean) => {
    // PUT /modules syncs the full desired set rather than applying a delta.
    const desired = modules
      .filter((module) => (module.key === key ? next : module.enabled))
      .map((module) => module.key);

    setPendingKey(key);
    update.mutate(desired, {
      onSuccess: () => {
        const label = MODULE_CATALOG[key].label;
        toast.success(next ? t("toasts.turnedOn", { label }) : t("toasts.turnedOff", { label }));
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setPendingKey(null),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const info = MODULE_CATALOG[module.key];
          if (!info) return null;

          const Icon = info.icon;
          const busy = pendingKey === module.key;

          return (
            <Card key={module.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-4.5 text-muted-foreground" />
                  </span>
                  {info.label}
                  {module.enabled ? (
                    <Badge variant="success">{t("on")}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("off")}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{info.description}</CardDescription>
                <CardAction>
                  {busy ? (
                    <Spinner className="size-4 text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={module.enabled}
                      disabled={update.isPending}
                      onCheckedChange={(next) => {
                        // Turning a module off detaches its tools from every
                        // agent — never silently.
                        if (next) apply(module.key, true);
                        else setConfirming(module);
                      }}
                      aria-label={t("switchAria", { label: info.label })}
                    />
                  )}
                </CardAction>
              </CardHeader>

              {module.tools.length > 0 && (
                <CardContent className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{t("addsTools")}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {module.tools.map((tool) => (
                      <li key={tool}>
                        <Badge variant="secondary" className="font-normal">
                          {toolLabel(tool).label}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <ModuleSettingsSection />

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null);
        }}
      >
        <AlertDialogContent>
          {confirming && <DisableConfirmation module={confirming} />}
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!confirming) return;
                apply(confirming.key, false);
                setConfirming(null);
              }}
            >
              {t("turnOff")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Disabling keeps the module's data and settings, but it does strip the
 * module's tools from every agent and republish them — say so plainly.
 * Invoices contributes no tools, so that sentence drops out.
 */
function DisableConfirmation({ module }: { module: BusinessModule }) {
  const t = useTranslations("businessProfile.modules");
  const label = MODULE_CATALOG[module.key].label;
  const count = module.tools.length;

  return (
    <AlertDialogHeader>
      <AlertDialogTitle>{t("disableDialog.title", { label })}</AlertDialogTitle>
      <AlertDialogDescription>
        {t("disableDialog.keeps", { label })}
        {count > 0 && <> {t("disableDialog.toolsLost", { count })}</>}{" "}
        {t("disableDialog.sidebar", { label })}
      </AlertDialogDescription>
    </AlertDialogHeader>
  );
}
