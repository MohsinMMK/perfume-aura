"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
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
  const emailConstraints = useNativeConstraints({ required: true });
  const passwordConstraints = useNativeConstraints({
    required: true,
    minLength: AUTH_PASSWORD_MIN_LENGTH,
    maxLength: AUTH_PASSWORD_MAX_LENGTH,
  });
  const invalid = error ? { type: "error" as const } : undefined;

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
      <VStack gap={4}>
        <TextInput
          ref={emailConstraints}
          id="email"
          htmlName="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="name@company.com"
          status={invalid}
          controlClassName="min-h-11"
        />

        <VStack gap={1}>
          <TextInput
            ref={passwordConstraints}
            id="password"
            htmlName="password"
            label="Password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            status={invalid}
            controlClassName="min-h-11"
          />
          <HStack justify="between" align="center" gap={4} wrap="wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              label={passwordVisible ? "Hide password" : "Show password"}
              onClick={() => setPasswordVisible((visible) => !visible)}
            />
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center rounded-md px-2 text-sm text-secondary underline-offset-4 hover:text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </HStack>
        </VStack>

        {error ? (
          <div role="alert">
            <Banner status="error" title={error} />
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          width="100%"
          isLoading={pending}
          label={pending ? "Signing in…" : "Sign in"}
        />
      </VStack>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<Skeleton height={160} />}>
      <LoginFormInner />
    </Suspense>
  );
}
