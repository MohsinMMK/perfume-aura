"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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

const genericRecoveryMessage =
  "If an eligible account exists, a recovery email will be sent.";
const GoogleSignInButton = dynamic(() =>
  import("./google-sign-in-button").then(
    (module) => module.GoogleSignInButton,
  ),
);

type CustomerAuthError = {
  code?: string;
  status?: number;
};

function verificationRequired(error: CustomerAuthError | null | undefined) {
  return (
    error?.status === 403 ||
    error?.code?.toUpperCase() === "EMAIL_NOT_VERIFIED"
  );
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"•".repeat(Math.max(2, localPart.length - visible.length))}@${domain}`;
}

function PreviewGoogleButton() {
  return (
    <button
      type="button"
      disabled
      className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[var(--aura-radius)] border border-black/25 bg-transparent px-4 text-sm font-semibold text-[var(--aura-text-muted-on-ivory)]"
    >
      <span aria-hidden="true" className="text-base font-bold">G</span>
      Continue with Google
    </button>
  );
}

export function AccountForm({
  mode,
  enabled,
  providers,
  googleClientId,
  callbackURL = "/account",
  notice,
}: Readonly<{
  mode: "sign-in" | "register" | "recover";
  enabled: boolean;
  providers: Readonly<{ google: boolean }>;
  googleClientId: string | null;
  callbackURL?: string;
  notice?: string;
}>) {
  const router = useRouter();
  const register = mode === "register";
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    setPending(true);
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const { customerAuthClient } = await import("@/lib/customer-auth-client");
      if (mode === "recover") {
        await customerAuthClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/account/recover`,
        });
        setMessage(genericRecoveryMessage);
        return;
      }

      const result = register
        ? await customerAuthClient.signUp.email({
            name: String(formData.get("name") ?? "").trim(),
            email,
            password: String(formData.get("password") ?? ""),
            callbackURL,
          })
        : await customerAuthClient.signIn.email({
            email,
            password: String(formData.get("password") ?? ""),
            callbackURL,
          });

      if (result.error) {
        if (!register && verificationRequired(result.error)) {
          setVerificationEmail(email);
          return;
        }
        setError(
          register
            ? "Account creation could not be completed. Check your details and try again."
            : "Email or password is incorrect.",
        );
        return;
      }

      if (register) {
        setVerificationEmail(email);
      } else {
        router.replace(callbackURL);
        router.refresh();
      }
    } catch {
      setError(
        mode === "recover"
          ? genericRecoveryMessage
          : "Sign-in is temporarily unavailable. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function resendVerificationEmail() {
    if (!enabled || !verificationEmail) return;
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const { customerAuthClient } = await import("@/lib/customer-auth-client");
      const result = await customerAuthClient.sendVerificationEmail({
        email: verificationEmail,
        callbackURL,
      });
      if (result.error) {
        setError("The verification email could not be sent. Please try again.");
        return;
      }
      setMessage("A new verification email has been sent.");
    } catch {
      setError("The verification email could not be sent. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (verificationEmail) {
    return (
      <div className="grid gap-5" role="status" aria-live="polite">
        <div className="border-y border-black/20 py-5">
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]">
            We sent a verification link to <strong className="text-[var(--aura-ink)]">{maskEmail(verificationEmail)}</strong>. Verify your email, then return to sign in.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 rounded-[var(--aura-radius)] border-black/25 bg-transparent text-[var(--aura-ink)] hover:bg-black/5"
          disabled={pending}
          focusableWhenDisabled={pending}
          onClick={resendVerificationEmail}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Sending…" : "Resend verification email"}
        </Button>
        <button
          type="button"
          className="min-h-11 justify-self-start text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ink)]"
          onClick={() => {
            setVerificationEmail(null);
            setError(null);
            setMessage(null);
          }}
        >
          Use a different email
        </button>
        {error ? <FieldError>{error}</FieldError> : null}
        {message ? <p className="text-sm text-emerald-900">{message}</p> : null}
      </div>
    );
  }

  const showGooglePreview = mode !== "recover" && !enabled;
  const showGoogle =
    mode !== "recover" &&
    enabled &&
    providers.google &&
    Boolean(googleClientId);

  return (
    <form
      onSubmit={onSubmit}
      aria-describedby={!enabled ? "auth-availability" : undefined}
    >
      <FieldGroup className="gap-5">
        {notice ? (
          <p className="border-y border-[var(--aura-brass)]/55 bg-black/[0.025] py-3 text-sm leading-6">
            {notice}
          </p>
        ) : null}

        {!enabled ? (
          <p
            id="auth-availability"
            className="rounded-[var(--aura-radius)] bg-black/[0.055] px-4 py-3 text-sm leading-6 text-[var(--aura-text-muted-on-ivory)]"
          >
            Customer accounts are not open yet. You can continue browsing and building your cart.
          </p>
        ) : null}

        {showGooglePreview ? <PreviewGoogleButton /> : null}
        {showGoogle && googleClientId ? (
          <GoogleSignInButton
            clientId={googleClientId}
            callbackURL={callbackURL}
          />
        ) : null}

        {showGooglePreview || showGoogle ? (
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--aura-text-muted-on-ivory)]">
            <span className="h-px flex-1 bg-black/20" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-black/20" />
          </div>
        ) : null}

        {register ? (
          <Field>
            <FieldLabel htmlFor="account-name" className="text-sm font-semibold">
              Full name
            </FieldLabel>
            <Input
              id="account-name"
              name="name"
              autoComplete="name"
              className="min-h-13 rounded-[var(--aura-radius)] border-black/25 bg-transparent px-4 text-[var(--aura-ink)] placeholder:text-[#6f675d] focus-visible:border-[var(--aura-ink)] focus-visible:ring-black/15"
              required
              disabled={!enabled || pending}
            />
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="account-email" className="text-sm font-semibold">
            Email address
          </FieldLabel>
          <Input
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="min-h-13 rounded-[var(--aura-radius)] border-black/25 bg-transparent px-4 text-[var(--aura-ink)] placeholder:text-[#6f675d] focus-visible:border-[var(--aura-ink)] focus-visible:ring-black/15"
            required
            disabled={!enabled || pending}
          />
        </Field>

        {mode !== "recover" ? (
          <Field>
            <div className="flex min-h-6 items-center justify-between gap-4">
              <FieldLabel htmlFor="account-password" className="text-sm font-semibold">
                Password
              </FieldLabel>
              {mode === "sign-in" ? (
                <Link
                  href="/account/recover"
                  className="text-sm font-medium text-[var(--aura-text-muted-on-ivory)] underline-offset-4 hover:text-[var(--aura-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ink)]"
                >
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <div className="relative">
              <Input
                id="account-password"
                name="password"
                type={passwordVisible ? "text" : "password"}
                minLength={12}
                maxLength={256}
                autoComplete={register ? "new-password" : "current-password"}
                className="min-h-13 rounded-[var(--aura-radius)] border-black/25 bg-transparent px-4 pr-20 text-[var(--aura-ink)] placeholder:text-[#6f675d] focus-visible:border-[var(--aura-ink)] focus-visible:ring-black/15"
                required
                disabled={!enabled || pending}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 min-w-16 rounded-md px-3 text-sm font-semibold text-[var(--aura-text-muted-on-ivory)] hover:text-[var(--aura-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--aura-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                disabled={!enabled || pending}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? "Hide" : "Show"}
              </button>
            </div>
            {register ? (
              <FieldDescription className="text-[var(--aura-text-muted-on-ivory)]">
                Use 12–256 characters.
              </FieldDescription>
            ) : null}
          </Field>
        ) : null}

        {register ? (
          <p className="text-xs leading-5 text-[var(--aura-text-muted-on-ivory)]">
            By creating an account, you agree to the <Link href="/terms" className="font-semibold underline underline-offset-4">Terms</Link> and acknowledge the <Link href="/privacy" className="font-semibold underline underline-offset-4">Privacy Policy</Link>.
          </p>
        ) : null}

        <Button
          type="submit"
          className="min-h-13 rounded-[var(--aura-radius)] bg-[var(--aura-ink)] px-5 text-[var(--aura-ivory)] hover:bg-black focus-visible:border-[var(--aura-ink)] focus-visible:ring-black/25"
          disabled={!enabled || pending}
          focusableWhenDisabled={pending}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending
            ? "Please wait…"
            : mode === "sign-in"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : "Send reset link"}
        </Button>

        {error ? <FieldError>{error}</FieldError> : null}
        {message ? (
          <p className="rounded-[var(--aura-radius)] bg-emerald-900/10 px-4 py-3 text-sm leading-6 text-emerald-950" role="status">
            {message}
          </p>
        ) : null}
      </FieldGroup>
    </form>
  );
}
