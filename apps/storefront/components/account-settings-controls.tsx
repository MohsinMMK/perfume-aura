"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@perfume-aura/ui/components/button";
import { customerAuthClient } from "@/lib/customer-auth-client";

export function AccountSettingsControls({ enabled }: Readonly<{ enabled: boolean }>) {
  const router = useRouter();
  const session = customerAuthClient.useSession();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!enabled) return <p className="mt-6 text-sm text-[#5f584f]">Customer account controls are release-gated.</p>;
  if (session.isPending) return <p className="mt-6 text-sm text-[#5f584f]">Loading account…</p>;
  if (!session.data?.user) return <p className="mt-6 text-sm text-[#5f584f]">Sign in to manage sessions or delete your account.</p>;

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("The account action could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-8 grid max-w-xl gap-4"><div className="border border-black/20 p-5"><h2 className="font-[var(--font-playfair)] text-2xl">Sessions</h2><p className="mt-2 text-sm text-[#5f584f]">Revoke every other customer session, or sign out this browser.</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" variant="outline" className="min-h-11 rounded-none border-black/25 bg-transparent" disabled={pending} focusableWhenDisabled={pending} onClick={() => run(() => customerAuthClient.revokeOtherSessions(), "Other sessions revoked.")}>Revoke other sessions</Button><Button type="button" variant="outline" className="min-h-11 rounded-none border-black/25 bg-transparent" disabled={pending} focusableWhenDisabled={pending} onClick={() => run(async () => { await customerAuthClient.signOut(); router.replace("/"); router.refresh(); }, "Signed out.")}>Sign out</Button></div></div><div className="border border-red-900/25 p-5"><h2 className="font-[var(--font-playfair)] text-2xl">Delete account</h2><p className="mt-2 text-sm text-[#5f584f]">A verification email is required before deletion completes. Order records remain for legal and financial obligations.</p><Button type="button" variant="destructive" className="mt-4 min-h-11 rounded-none" disabled={pending} focusableWhenDisabled={pending} onClick={() => run(() => customerAuthClient.deleteUser({ callbackURL: "/" }), "Check your email to confirm deletion.")}>Request account deletion</Button></div>{message ? <p role="status" className="text-sm">{message}</p> : null}</div>;
}
