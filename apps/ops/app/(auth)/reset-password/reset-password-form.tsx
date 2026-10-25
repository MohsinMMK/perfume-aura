"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
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
  const passwordConstraints = useNativeConstraints({
    required: true,
    minLength: AUTH_PASSWORD_MIN_LENGTH,
    maxLength: AUTH_PASSWORD_MAX_LENGTH,
  });
  const invalid = error ? { type: "error" as const } : undefined;

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
      <VStack gap={5}>
        <div role="status">
          <Text as="p" color="secondary">
            Your password has been reset. Existing sessions were revoked.
          </Text>
        </div>
        <Button label="Sign in" href="/login" variant="primary" width="100%" />
      </VStack>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <VStack gap={4}>
        <TextInput
          ref={passwordConstraints}
          id="new-password"
          htmlName="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          description={`Use ${AUTH_PASSWORD_MIN_LENGTH}–${AUTH_PASSWORD_MAX_LENGTH} characters.`}
          status={invalid}
          controlClassName="min-h-11"
        />

        <TextInput
          ref={passwordConstraints}
          id="confirm-password"
          htmlName="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={setConfirmation}
          status={invalid}
          controlClassName="min-h-11"
        />

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
          isDisabled={!token || Boolean(callbackError)}
          label={pending ? "Resetting…" : "Reset password"}
        />

        <Button
          label="Back to sign in"
          href="/login"
          variant="ghost"
          width="100%"
        />
      </VStack>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<Skeleton height={224} />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
