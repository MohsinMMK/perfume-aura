"use client";

import { FormEvent, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
import { authClient } from "@/lib/auth-client";

const GENERIC_RESET_MESSAGE =
  "If that email belongs to the owner account, a reset link will be sent.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const emailConstraints = useNativeConstraints({
    required: true,
    maxLength: 320,
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Deliberately return the same UI for unknown users and mail failures.
    } finally {
      setEmail("");
      setSubmitted(true);
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <VStack gap={5}>
        <div role="status" aria-live="polite">
          <Text as="p" color="secondary">
            {GENERIC_RESET_MESSAGE}
          </Text>
        </div>
        <Button
          label="Back to sign in"
          href="/login"
          variant="secondary"
          width="100%"
        />
      </VStack>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <VStack gap={4}>
        <TextInput
          ref={emailConstraints}
          id="reset-email"
          htmlName="email"
          label="Owner email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          description="The response is identical whether or not the address exists."
          controlClassName="min-h-11"
        />

        <Button
          type="submit"
          variant="primary"
          width="100%"
          isLoading={pending}
          label={pending ? "Requesting…" : "Send reset link"}
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
