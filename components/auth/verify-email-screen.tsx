"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MailCheckIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FullPageLoader } from "@/components/full-page-loader";
import { RequireAuth } from "@/components/auth/guards";
import { useLogout, useResendVerification } from "@/hooks/use-auth-mutations";
import { useMe } from "@/hooks/use-me";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const { data, refetch, isRefetching } = useMe();
  const router = useRouter();
  const resend = useResendVerification();
  const logout = useLogout();
  const t = useTranslations("auth.verifyEmail");

  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [stillUnverified, setStillUnverified] = useState(false);

  const verified = !!data?.user.email_verified;

  useEffect(() => {
    if (verified) router.replace("/");
  }, [verified, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || verified) return <FullPageLoader />;

  const onResend = () => {
    setNotice(null);
    setStillUnverified(false);
    resend.mutate(undefined, {
      onSuccess: (response) => {
        setNotice(response.message);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      },
    });
  };

  const onCheckVerified = async () => {
    setStillUnverified(false);
    const result = await refetch();
    // If verification came through, the effect above redirects — only the
    // still-unverified case needs feedback.
    if (result.data && !result.data.user.email_verified) {
      setStillUnverified(true);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t.rich("description", {
            email: data.user.email,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
      </div>

      {notice && (
        <Alert variant="success">
          <MailCheckIcon />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {resend.error && (
        <Alert variant="destructive">
          <AlertDescription>{resend.error.message}</AlertDescription>
        </Alert>
      )}

      {stillUnverified && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{t("stillUnverified.title")}</AlertTitle>
          <AlertDescription>{t("stillUnverified.description")}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onResend} disabled={resend.isPending || cooldown > 0}>
          {resend.isPending && <Spinner />}
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
        </Button>

        <Button variant="outline" onClick={onCheckVerified} disabled={isRefetching}>
          {isRefetching && <Spinner />}
          {t("checkVerified")}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t.rich("wrongAccount", {
          logout: (chunks) => (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="text-primary underline-offset-4 hover:underline"
            >
              {chunks}
            </button>
          ),
        })}
      </p>
    </div>
  );
}

export function VerifyEmailScreen() {
  return (
    <RequireAuth>
      <VerifyEmailContent />
    </RequireAuth>
  );
}
