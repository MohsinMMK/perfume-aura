"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Button,
  buttonVariants,
} from "@perfume-aura/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import { Spinner } from "@perfume-aura/ui/components/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@perfume-aura/ui/lib/utils";

const GENERIC_RESET_MESSAGE =
  "If that email belongs to the owner account, a reset link will be sent.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      <div className="flex flex-col gap-5 text-center">
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {GENERIC_RESET_MESSAGE}
        </p>
        <Link
          href="/login"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-email">Owner email</FieldLabel>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <FieldDescription>
            The response is identical whether or not the address exists.
          </FieldDescription>
        </Field>

        <Button
          type="submit"
          className="w-full"
          disabled={pending}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Requesting…" : "Send reset link"}
        </Button>

        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to sign in
        </Link>
      </FieldGroup>
    </form>
  );
}
