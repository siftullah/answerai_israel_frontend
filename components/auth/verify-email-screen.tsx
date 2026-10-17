"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
        <h1 className="font-heading text-2xl font-semibold">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{data.user.email}</span>.
          Click it to activate your account.
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
          <AlertTitle>Still not verified</AlertTitle>
          <AlertDescription>
            Click the link in your email first, then check again or resend it.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onResend} disabled={resend.isPending || cooldown > 0}>
          {resend.isPending && <Spinner />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
        </Button>

        <Button variant="outline" onClick={onCheckVerified} disabled={isRefetching}>
          {isRefetching && <Spinner />}
          I&apos;ve verified my email
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Wrong account?{" "}
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-primary underline-offset-4 hover:underline"
        >
          Log out
        </button>
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
