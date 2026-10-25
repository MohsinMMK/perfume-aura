"use client";

import { FormEvent, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
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
  const passwordConstraints = useNativeConstraints({
    required: true,
    minLength: AUTH_PASSWORD_MIN_LENGTH,
    maxLength: AUTH_PASSWORD_MAX_LENGTH,
  });
  const invalid = error ? { type: "error" as const } : undefined;

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
      <VStack gap={4}>
        <TextInput
          ref={passwordConstraints}
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          status={invalid}
          controlClassName="min-h-11"
        />

        <TextInput
          ref={passwordConstraints}
          id="settings-new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          description={`Use ${AUTH_PASSWORD_MIN_LENGTH}–${AUTH_PASSWORD_MAX_LENGTH} characters.`}
          status={invalid}
          controlClassName="min-h-11"
        />

        <TextInput
          ref={passwordConstraints}
          id="settings-confirm-password"
          label="Confirm new password"
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
        {success ? (
          <div role="status">
            <Text as="p" color="secondary">
              {success}
            </Text>
          </div>
        ) : null}

        <HStack justify="start">
          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            label={pending ? "Changing…" : "Change password"}
          />
        </HStack>
      </VStack>
    </form>
  );
}
