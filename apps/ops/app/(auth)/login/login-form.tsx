"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
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
  safeReturnPath,
} from "@/lib/auth-policy";
import { isProtectedOpsRole } from "@/lib/ops-access";
import {
  signInErrorMessage,
  signInNetworkErrorMessage,
} from "@/lib/auth-ui";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeReturnPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "access-denied"
      ? "Operations access is required."
      : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInErrorMessage(signInError));
        setPending(false);
        return;
      }

      const session = await authClient.getSession();
      if (session.error) {
        setError(signInErrorMessage(session.error));
        setPending(false);
        return;
      }

      if (!isProtectedOpsRole(session.data?.user.role)) {
        await authClient.signOut();
        setError("Operations access is required.");
        setPending(false);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(signInNetworkErrorMessage());
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="min-h-11"
            aria-invalid={error ? true : undefined}
          />
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={AUTH_PASSWORD_MIN_LENGTH}
              maxLength={AUTH_PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="min-h-11 pr-20"
              aria-invalid={error ? true : undefined}
            />
            <button
              type="button"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-1 min-w-16 rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}

        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={pending}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full rounded-md" />}>
      <LoginFormInner />
    </Suspense>
  );
}
