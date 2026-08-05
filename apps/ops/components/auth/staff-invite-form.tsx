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
import { toast } from "@perfume-aura/ui/components/sonner";
import { inviteStaffAction } from "@/lib/staff-operations";

export function StaffInviteForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      toast.success(
        result.data?.state === "created"
          ? "Staff invitation created"
          : "Password-setup link resent",
      );
      router.refresh();
    } catch {
      setError("The staff invitation could not be sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="staff-name">Staff member name</FieldLabel>
          <Input
            id="staff-name"
            name="name"
            required
            disabled={!enabled || pending}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="staff-email">Work email</FieldLabel>
          <Input
            id="staff-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={!enabled || pending}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button
          type="submit"
          disabled={!enabled || pending}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Sending…" : "Send password-setup link"}
        </Button>
      </FieldGroup>
    </form>
  );
}
