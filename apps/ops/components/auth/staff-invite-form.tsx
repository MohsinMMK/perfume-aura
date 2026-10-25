"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useNativeConstraints } from "@/components/auth/native-input-constraints";
import { inviteStaffAction } from "@/lib/staff-operations";

export function StaffInviteForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const showToast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const requiredConstraints = useNativeConstraints({ required: true });
  const invalid = error ? { type: "error" as const } : undefined;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await inviteStaffAction({ name, email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setEmail("");
      showToast({
        body:
          result.data?.state === "created"
            ? "Staff invitation created"
            : "Password-setup link resent",
      });
      router.refresh();
    } catch {
      setError("The staff invitation could not be sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <VStack gap={4}>
        <TextInput
          ref={requiredConstraints}
          id="staff-name"
          htmlName="name"
          label="Staff member name"
          isDisabled={!enabled || pending}
          value={name}
          onChange={setName}
          status={invalid}
          controlClassName="min-h-11"
        />
        <TextInput
          ref={requiredConstraints}
          id="staff-email"
          htmlName="email"
          label="Work email"
          type="email"
          autoComplete="email"
          isDisabled={!enabled || pending}
          value={email}
          onChange={setEmail}
          status={invalid}
          controlClassName="min-h-11"
        />
        {error ? (
          <div role="alert">
            <Banner status="error" title={error} />
          </div>
        ) : null}
        <HStack justify="start">
          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            isDisabled={!enabled}
            label={pending ? "Sending…" : "Send password-setup link"}
          />
        </HStack>
      </VStack>
    </form>
  );
}
