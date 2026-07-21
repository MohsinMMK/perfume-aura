"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
        setError(signInError.message || "Invalid email or password");
        setPending(false);
        return;
      }

      router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch {
      setError("Sign-in failed. Try again.");
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
            placeholder="owner@example.com"
            aria-invalid={error ? true : undefined}
          />
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-invalid={error ? true : undefined}
          />
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}

        <Button type="submit" className="w-full" disabled={pending}>
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
