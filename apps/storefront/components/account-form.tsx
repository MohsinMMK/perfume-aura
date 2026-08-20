"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@perfume-aura/ui/components/button";
import { Input } from "@perfume-aura/ui/components/input";

const genericRecoveryMessage = "If an eligible account exists, a recovery email will be sent.";
const GoogleSignInButton = dynamic(() =>
  import("./google-sign-in-button").then((module) => module.GoogleSignInButton),
);

export function AccountForm({
  mode,
  enabled,
  providers,
  googleClientId,
  callbackURL = "/account",
}: Readonly<{
  mode: "sign-in" | "register" | "recover";
  enabled: boolean;
  providers: Readonly<{ google: boolean }>;
  googleClientId: string | null;
  callbackURL?: string;
}>) {
  const router = useRouter();
  const register = mode === "register";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        setError(register ? "Account creation could not be completed." : "Email or password is incorrect.");
        return;
      }
      if (register) {
        setMessage("Check your email to verify your account before signing in.");
      } else {
        router.replace(callbackURL);
        router.refresh();
      }
    } catch {
      setError(mode === "recover" ? genericRecoveryMessage : "Customer authentication is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={onSubmit} className="mt-9 grid max-w-lg gap-5" aria-describedby={!enabled ? "auth-gate" : undefined}>
    {mode !== "recover" && enabled && providers.google && googleClientId ? <>
      <GoogleSignInButton clientId={googleClientId} callbackURL={callbackURL} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[#655f57]"><span className="h-px flex-1 bg-black/20" /><span>or use email</span><span className="h-px flex-1 bg-black/20" /></div>
    </> : null}
    {register ? <div><label htmlFor="account-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Name</label><Input id="account-name" name="name" autoComplete="name" className="min-h-12 rounded-none border-black/25 bg-transparent" required disabled={!enabled || pending} /></div> : null}
    <div><label htmlFor="account-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Email</label><Input id="account-email" name="email" type="email" autoComplete="email" className="min-h-12 rounded-none border-black/25 bg-transparent" required disabled={!enabled || pending} /></div>
    {mode !== "recover" ? <div><label htmlFor="account-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em]">Password</label><Input id="account-password" name="password" type="password" minLength={12} maxLength={256} autoComplete={register ? "new-password" : "current-password"} className="min-h-12 rounded-none border-black/25 bg-transparent" required disabled={!enabled || pending} /></div> : null}
    <Button type="submit" className="min-h-12 rounded-none" disabled={!enabled || pending} focusableWhenDisabled={pending}>{pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "register" ? "Create account" : "Send recovery email"}</Button>
    {error ? <p className="text-sm text-red-800" role="alert">{error}</p> : null}
    {message ? <p className="text-sm text-emerald-800" role="status">{message}</p> : null}
    {!enabled ? <p id="auth-gate" className="text-xs leading-5 text-[#655f57]">Customer authentication is isolated from owner auth and remains disabled until its production secret, callback domains, email sender, and provider credentials are configured.</p> : null}
  </form>;
}
