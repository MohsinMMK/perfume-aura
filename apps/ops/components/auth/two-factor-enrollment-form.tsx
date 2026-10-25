"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
import { authClient } from "@/lib/auth-client";

type EnrollmentState = {
  backupCodes: string[];
  totpURI: string;
};

function errorMessage(error: { message?: string } | null): string {
  return error?.message || "Two-factor authentication could not be completed.";
}

/**
 * Better Auth's official TOTP flow. Recovery codes are held in component state
 * only and never sent to a Server Action, stored in local storage, or logged.
 */
export function TwoFactorEnrollmentForm({
  enforced,
}: {
  enforced: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [confirmedBackupCodes, setConfirmedBackupCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const passwordConstraints = useNativeConstraints({ required: true });
  const codeConstraints = useNativeConstraints({
    required: true,
    pattern: "[0-9]{6}",
    inputMode: "numeric",
  });
  const invalid = error ? { type: "error" as const } : undefined;

  async function startEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await authClient.twoFactor.enable({
        password,
        method: "totp",
      });
      if (result.error || !result.data) {
        setError(errorMessage(result.error));
        return;
      }
      if (result.data.method !== "totp") {
        setError("Authenticator enrollment returned an unexpected method.");
        return;
      }
      setEnrollment({
        backupCodes: result.data.backupCodes,
        totpURI: result.data.totpURI,
      });
      setPassword("");
    } catch {
      setError("Network error while starting two-factor enrollment.");
    } finally {
      setPending(false);
    }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || !confirmedBackupCodes) {
      setError("Confirm that you have stored every recovery code first.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: code.trim(),
        trustDevice: true,
      });
      if (result.error) {
        setError(errorMessage(result.error));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while verifying the authenticator code.");
    } finally {
      setPending(false);
    }
  }

  const errorBanner = error ? (
    <div role="alert">
      <Banner status="error" title={error} />
    </div>
  ) : null;

  if (enrollment) {
    return (
      <form onSubmit={verifyEnrollment}>
        <VStack gap={5}>
          <Card variant="muted" padding={4}>
            <VStack gap={3}>
              <VStack gap={1}>
                <Heading level={3}>1. Add this setup key</Heading>
                <Text as="p" color="secondary">
                  In an authenticator app, choose manual setup and use this
                  one-time URI. It is visible only while this page remains open.
                </Text>
              </VStack>
              <code className="block overflow-x-auto rounded-md border border-border bg-surface p-3 font-mono text-xs text-primary">
                {enrollment.totpURI}
              </code>
            </VStack>
          </Card>

          <Card variant="yellow" padding={4}>
            <VStack gap={3}>
              <VStack gap={1}>
                <Heading level={3}>2. Store recovery codes now</Heading>
                <Text as="p" color="secondary">
                  Each code works once. They will not be shown again on this
                  page.
                </Text>
              </VStack>
              <ul className="grid grid-cols-2 gap-2 font-mono text-sm text-primary sm:grid-cols-3">
                {enrollment.backupCodes.map((backupCode) => (
                  <li
                    key={backupCode}
                    className="rounded-md bg-surface px-2 py-1"
                  >
                    {backupCode}
                  </li>
                ))}
              </ul>
              <div className="flex min-h-11 items-center">
                <CheckboxInput
                  label="I have safely stored every recovery code."
                  value={confirmedBackupCodes}
                  onChange={setConfirmedBackupCodes}
                />
              </div>
            </VStack>
          </Card>

          <TextInput
            ref={codeConstraints}
            id="totp-code"
            htmlName="totp-code"
            label="3. Verify the 6-digit code"
            autoComplete="one-time-code"
            value={code}
            onChange={(value) => setCode(value.replace(/\D/g, ""))}
            status={invalid}
            controlClassName="min-h-11"
          />

          {errorBanner}

          <HStack justify="start">
            <Button
              type="submit"
              variant="primary"
              isLoading={pending}
              isDisabled={!confirmedBackupCodes}
              label={pending ? "Verifying…" : "Verify and finish"}
            />
          </HStack>
        </VStack>
      </form>
    );
  }

  return (
    <form onSubmit={startEnrollment}>
      <VStack gap={4}>
        <TextInput
          ref={passwordConstraints}
          id="two-factor-password"
          htmlName="password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          status={invalid}
          controlClassName="min-h-11"
        />
        {errorBanner}
        <HStack justify="start">
          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            label={
              pending
                ? "Preparing…"
                : enforced
                  ? "Set up required two-factor authentication"
                  : "Set up two-factor authentication"
            }
          />
        </HStack>
      </VStack>
    </form>
  );
}
