"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import { Spinner } from "@perfume-aura/ui/components/spinner";
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
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="two-factor-challenge-code">
            {useRecoveryCode ? "Recovery code" : "Authenticator code"}
          </FieldLabel>
          <Input
            id="two-factor-challenge-code"
            name="code"
            autoComplete="one-time-code"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        {error ? <FieldError>{error}</FieldError> : null}

        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.currentTarget.checked)}
          />
          Trust this private device for 30 days.
        </label>

        <Button
          type="submit"
          disabled={pending}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Verifying…" : "Continue"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setUseRecoveryCode((current) => !current);
            setCode("");
            setError(null);
          }}
        >
          {useRecoveryCode
            ? "Use authenticator code"
            : "Use a recovery code instead"}
        </Button>
      </FieldGroup>
    </form>
  );
}
