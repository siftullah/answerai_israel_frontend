"use client";

import { useState } from "react";
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
        title="Phone numbers"
        description="The numbers your AI answers on — bought here or brought over your own trunk."
        actions={
          tab === "numbers" ? (
            <>
              <Button
                variant="cta"
                disabled={sipQuery.isPending}
                onClick={handleAddSip}
              >
                <PlusIcon />
                Add SIP number
              </Button>
              <Button onClick={() => setBuyOpen(true)}>
                <PlusIcon />
                Buy number
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "numbers" | "sip")}>
        <TabsList>
          <TabsTrigger value="numbers">Numbers</TabsTrigger>
          <TabsTrigger value="sip">SIP trunk</TabsTrigger>
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
            <AlertDialogTitle>Connect a SIP trunk first</AlertDialogTitle>
            <AlertDialogDescription>
              SIP numbers ride on your own trunk. Connect one, then register the numbers
              it carries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setGateOpen(false);
                setTab("sip");
              }}
            >
              Go to SIP trunk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
