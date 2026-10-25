"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
import { authClient } from "@/lib/auth-client";

function errorMessage(error: { message?: string } | null): string {
  return error?.message || "The verification code was not accepted.";
}

export function TwoFactorChallengeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const codeConstraints = useNativeConstraints({
    required: true,
    inputMode: useRecoveryCode ? "text" : "numeric",
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = useRecoveryCode
        ? await authClient.twoFactor.verifyBackupCode({
            code: code.trim(),
            trustDevice,
          })
        : await authClient.twoFactor.verifyTotp({
            code: code.trim(),
            trustDevice,
          });

      if (result.error) {
        setError(errorMessage(result.error));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while verifying your second factor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <VStack gap={4}>
        <TextInput
          ref={codeConstraints}
          id="two-factor-challenge-code"
          htmlName="code"
          label={useRecoveryCode ? "Recovery code" : "Authenticator code"}
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          status={error ? { type: "error" } : undefined}
          controlClassName="min-h-11"
        />
        {error ? (
          <div role="alert">
            <Banner status="error" title={error} />
          </div>
        ) : null}

        <CheckboxInput
          label="Trust this private device for 30 days."
          value={trustDevice}
          onChange={setTrustDevice}
        />

        <Button
          type="submit"
          variant="primary"
          width="100%"
          isLoading={pending}
          label={pending ? "Verifying…" : "Continue"}
        />

        <Button
          type="button"
          variant="ghost"
          width="100%"
          label={
            useRecoveryCode
              ? "Use authenticator code"
              : "Use a recovery code instead"
          }
          onClick={() => {
            setUseRecoveryCode((current) => !current);
            setCode("");
            setError(null);
          }}
        />
      </VStack>
    </form>
  );
}
