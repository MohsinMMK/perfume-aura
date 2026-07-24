"use client";

import { FormEvent, useState } from "react";
import { Button } from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-policy";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      newPassword.length < AUTH_PASSWORD_MIN_LENGTH ||
      newPassword.length > AUTH_PASSWORD_MAX_LENGTH
    ) {
      setError(
        `Password must be ${AUTH_PASSWORD_MIN_LENGTH}–${AUTH_PASSWORD_MAX_LENGTH} characters.`,
      );
      return;
    }
    if (newPassword !== confirmation) {
      setError("New passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError("Password could not be changed.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess("Password changed. Other sessions were revoked.");
    } catch {
      setError("Password could not be changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg">
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="current-password">
            Current password
          </FieldLabel>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="settings-new-password">
            New password
          </FieldLabel>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <FieldDescription>
            Use {AUTH_PASSWORD_MIN_LENGTH}–{AUTH_PASSWORD_MAX_LENGTH} characters.
          </FieldDescription>
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="settings-confirm-password">
            Confirm new password
          </FieldLabel>
          <Input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}
        {success ? (
          <p className="text-sm text-muted-foreground" role="status">
            {success}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Changing…" : "Change password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
