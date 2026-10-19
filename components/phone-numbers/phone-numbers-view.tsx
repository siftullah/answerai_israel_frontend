"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { AddSipNumberDialog } from "@/components/phone-numbers/add-sip-number-dialog";
import { BuyNumberDialog } from "@/components/phone-numbers/buy-number-dialog";
import { NumbersTab } from "@/components/phone-numbers/numbers-tab";
import { SipTrunkTab } from "@/components/phone-numbers/sip-trunk-tab";
import { useSipConnection } from "@/hooks/use-sip-connection";

export function PhoneNumbersView() {
  const t = useTranslations("phoneNumbers");
  const tc = useTranslations("common");
  const { business } = useBusiness();

  // Shared with SipTrunkTab via the query cache — no duplicate request.
  const sipQuery = useSipConnection(business.id);

  const [tab, setTab] = useState<"numbers" | "sip">("numbers");
  const [buyOpen, setBuyOpen] = useState(false);
  const [addSipOpen, setAddSipOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  const handleAddSip = () => {
    if (sipQuery.data?.status === "active") {
      setAddSipOpen(true);
    } else {
      setGateOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={
          tab === "numbers" ? (
            <>
              <Button
                variant="cta"
                disabled={sipQuery.isPending}
                onClick={handleAddSip}
              >
                <PlusIcon />
                {t("page.addSipNumber")}
              </Button>
              <Button onClick={() => setBuyOpen(true)}>
                <PlusIcon />
                {t("page.buyNumber")}
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "numbers" | "sip")}>
        <TabsList>
          <TabsTrigger value="numbers">{t("tabs.numbers")}</TabsTrigger>
          <TabsTrigger value="sip">{t("tabs.sip")}</TabsTrigger>
        </TabsList>
        <TabsContent value="numbers" className="pt-4">
          <NumbersTab onBuy={() => setBuyOpen(true)} onAddSip={handleAddSip} />
        </TabsContent>
        <TabsContent value="sip" className="pt-4">
          <SipTrunkTab />
        </TabsContent>
      </Tabs>

      {buyOpen && (
        <BuyNumberDialog
          open
          onOpenChange={(next) => {
            if (!next) setBuyOpen(false);
          }}
        />
      )}

      {addSipOpen && (
        <AddSipNumberDialog
          open
          onOpenChange={(next) => {
            if (!next) setAddSipOpen(false);
          }}
        />
      )}

      <AlertDialog open={gateOpen} onOpenChange={setGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sipGate.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sipGate.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setGateOpen(false);
                setTab("sip");
              }}
            >
              {t("sipGate.goToSip")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
