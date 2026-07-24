"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import { Skeleton } from "@perfume-aura/ui/components/skeleton";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-policy";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(
    !token || callbackError ? "This reset link is invalid or expired." : null,
  );
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("This reset link is invalid or expired.");
      return;
    }
    if (
      password.length < AUTH_PASSWORD_MIN_LENGTH ||
      password.length > AUTH_PASSWORD_MAX_LENGTH
    ) {
      setError(
        `Password must be ${AUTH_PASSWORD_MIN_LENGTH}–${AUTH_PASSWORD_MAX_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError("This reset link is invalid or expired.");
        return;
      }

      setPassword("");
      setConfirmation("");
      setSuccess(true);
      router.replace("/reset-password");
    } catch {
      setError("This reset link is invalid or expired.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-muted-foreground" role="status">
          Your password has been reset. Existing sessions were revoked.
        </p>
        <Button render={<Link href="/login" />}>Sign in</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
          <FieldDescription>
            Use {AUTH_PASSWORD_MIN_LENGTH}–{AUTH_PASSWORD_MAX_LENGTH} characters.
          </FieldDescription>
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="confirm-password">
            Confirm password
          </FieldLabel>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}

        <Button
          type="submit"
          className="w-full"
          disabled={pending || !token || Boolean(callbackError)}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Resetting…" : "Reset password"}
        </Button>

        <Button
          render={<Link href="/login" />}
          type="button"
          variant="ghost"
          className="w-full"
        >
          Back to sign in
        </Button>
      </FieldGroup>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full rounded-md" />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
