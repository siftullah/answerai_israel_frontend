"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { FullPageLoader } from "@/components/full-page-loader";
import { useAcceptInvitation } from "@/hooks/use-auth-mutations";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { setLastUsedBusiness } from "@/lib/business/last-used";
import { acceptInvitationSchema, type AcceptInvitationValues } from "@/lib/validation/auth";

/** Logout without the global /login redirect — reload keeps us on this URL. */
function logoutAndStay() {
  api.post(endpoints.auth.logout).finally(() => window.location.reload());
}

function InvalidLinkCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col gap-5">
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button render={<Link href="/login" />} variant="outline">
        Go to log in
      </Button>
    </div>
  );
}

/** Logged-in user: one-click accept. */
function AcceptAsCurrentUser({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const error = accept.error;

  if (error?.status === 410) {
    return (
      <InvalidLinkCard
        title="Invitation no longer valid"
        message={error.message}
      />
    );
  }

  if (error?.status === 403) {
    return (
      <div className="flex flex-col gap-5">
        <Alert variant="destructive">
          <AlertTitle>Wrong account</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button onClick={logoutAndStay}>Log out and switch accounts</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">You&apos;ve been invited</h1>
        <p className="text-sm text-muted-foreground">
          Accept this invitation as <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      {error && error.status !== 403 && error.status !== 410 && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={() =>
          accept.mutate(
            { token },
            {
              onSuccess: (data) => {
                setLastUsedBusiness(data.business.id);
                router.replace(`/b/${data.business.id}`);
              },
            }
          )
        }
        disabled={accept.isPending}
      >
        {accept.isPending && <Spinner />}
        Accept invitation
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Not you?{" "}
        <button
          type="button"
          onClick={logoutAndStay}
          className="text-primary underline-offset-4 hover:underline"
        >
          Log out
        </button>
      </p>
    </div>
  );
}

/** Logged-out visitor: create the account while accepting. */
function AcceptAsNewUser({ token }: { token: string }) {
  const router = useRouter();
  const accept = useAcceptInvitation();

  const form = useForm<AcceptInvitationValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { first_name: "", last_name: "", password: "" },
  });
  const { errors } = form.formState;

  const terminalError =
    accept.error && (accept.error.status === 410 || accept.error.status === 403)
      ? accept.error
      : null;

  if (terminalError?.status === 410) {
    return (
      <InvalidLinkCard title="Invitation no longer valid" message={terminalError.message} />
    );
  }

  if (terminalError?.status === 403) {
    const returnTo = encodeURIComponent(`/accept-invitation?token=${token}`);
    return (
      <div className="flex flex-col gap-5">
        <Alert>
          <AlertTitle>This invite belongs to an existing account</AlertTitle>
          <AlertDescription>{terminalError.message}</AlertDescription>
        </Alert>
        <Button render={<Link href={`/login?return=${returnTo}`} />}>Log in to accept</Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    accept.mutate(
      { token, ...values },
      {
        onSuccess: (data) => {
          // New users are auto-logged-in and auto-verified.
          setLastUsedBusiness(data.business.id);
          router.replace(`/b/${data.business.id}`);
        },
        onError: (error) => {
          if (error.status === 422) applyServerErrors(form, error);
        },
      }
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">You&apos;ve been invited</h1>
        <p className="text-sm text-muted-foreground">
          Finish setting up your account to join the team.
        </p>
      </div>

      {errors.root?.server && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}

      {accept.error && !terminalError && accept.error.status !== 422 && (
        <Alert variant="destructive">
          <AlertDescription>{accept.error.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.first_name || undefined}>
              <FieldLabel htmlFor="first_name">First name</FieldLabel>
              <Input
                id="first_name"
                autoComplete="given-name"
                aria-invalid={!!errors.first_name}
                {...form.register("first_name")}
              />
              {errors.first_name && <FieldError>{errors.first_name.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.last_name || undefined}>
              <FieldLabel htmlFor="last_name">Last name</FieldLabel>
              <Input
                id="last_name"
                autoComplete="family-name"
                aria-invalid={!!errors.last_name}
                {...form.register("last_name")}
              />
              {errors.last_name && <FieldError>{errors.last_name.message}</FieldError>}
            </Field>
          </div>

          <Field data-invalid={!!errors.password || undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            {errors.password ? (
              <FieldError>{errors.password.message}</FieldError>
            ) : (
              <FieldDescription>At least 8 characters.</FieldDescription>
            )}
          </Field>

          <Button type="submit" disabled={accept.isPending}>
            {accept.isPending && <Spinner />}
            Accept invitation
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login?return=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Log in first
        </Link>
      </p>
    </div>
  );
}

export function AcceptInvitationFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data, error, isPending } = useMe();

  if (!token) {
    return (
      <InvalidLinkCard
        title="Invalid invitation link"
        message="This link is missing its invitation token. Check the link in your email or ask for a new invite."
      />
    );
  }

  if (isPending) return <FullPageLoader />;

  // 401 from /me = logged out → new-user path; anything else with data = logged in.
  if (data) {
    return <AcceptAsCurrentUser token={token} email={data.user.email} />;
  }

  if (error && error.status !== 401) {
    return <InvalidLinkCard title="Something went wrong" message={error.message} />;
  }

  return <AcceptAsNewUser token={token} />;
}
