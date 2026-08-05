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

  async function startEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error || !result.data) {
        setError(errorMessage(result.error));
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

  if (enrollment) {
    return (
      <form onSubmit={verifyEnrollment} className="flex flex-col gap-5">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-medium">1. Add this setup key</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            In an authenticator app, choose manual setup and use this one-time
            URI. It is visible only while this page remains open.
          </p>
          <code className="mt-3 block overflow-x-auto rounded bg-background p-3 text-xs">
            {enrollment.totpURI}
          </code>
        </div>

        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
          <h3 className="text-sm font-medium">2. Store recovery codes now</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each code works once. They will not be shown again on this page.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-3">
            {enrollment.backupCodes.map((backupCode) => (
              <li key={backupCode} className="rounded bg-background px-2 py-1">
                {backupCode}
              </li>
            ))}
          </ul>
          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmedBackupCodes}
              onChange={(event) =>
                setConfirmedBackupCodes(event.currentTarget.checked)
              }
            />
            I have safely stored every recovery code.
          </label>
        </div>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="totp-code">3. Verify the 6-digit code</FieldLabel>
          <Input
            id="totp-code"
            name="totp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            aria-invalid={error ? true : undefined}
          />
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}

        <Button
          type="submit"
          disabled={pending || !confirmedBackupCodes}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Verifying…" : "Verify and finish"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={startEnrollment}>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="two-factor-password">Current password</FieldLabel>
          <Input
            id="two-factor-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button
          type="submit"
          disabled={pending}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending
            ? "Preparing…"
            : enforced
              ? "Set up required two-factor authentication"
              : "Set up two-factor authentication"}
        </Button>
      </FieldGroup>
    </form>
  );
}
