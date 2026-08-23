"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";

export function CustomerHeaderNavigation({
  mobile = false,
  closeMenu,
}: Readonly<{
  mobile?: boolean;
  closeMenu?: () => void;
}>) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/customer-auth/get-session", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: unknown } | null;
      setSignedIn(Boolean(result?.user));
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const signOut = async () => {
    const { customerAuthClient } = await import("@/lib/customer-auth-client");
    const result = await customerAuthClient.signOut();
    if (result.error) return;
    closeMenu?.();
    setSignedIn(false);
    router.replace("/");
    router.refresh();
  };

  if (mobile) {
    if (!signedIn) {
      return <Button render={<Link href="/account/sign-in" prefetch={false} onClick={closeMenu} />} nativeButton={false} variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)] hover:bg-[var(--aura-ink)] hover:text-[var(--aura-ivory)]"><HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.7} /> Sign in</Button>;
    }
    return <div className="col-span-2 grid grid-cols-2 gap-2"><Button render={<Link href="/account/orders" prefetch={false} onClick={closeMenu} />} nativeButton={false} variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)]">Orders</Button><Button render={<Link href="/account/delivery" prefetch={false} onClick={closeMenu} />} nativeButton={false} variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)]">Delivery</Button><Button render={<Link href="/account/settings" prefetch={false} onClick={closeMenu} />} nativeButton={false} variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)]">Settings</Button><Button type="button" variant="outline" className="min-h-12 rounded-[var(--aura-radius)] border-[color:rgb(16_11_6_/_35%)] bg-transparent text-[var(--aura-ink)]" onClick={signOut}>Sign out</Button></div>;
  }

  if (!signedIn) {
    return <Link href="/account/sign-in" prefetch={false} aria-label="Sign in to customer account" className="grid min-h-20 min-w-12 place-items-center border-b border-transparent transition hover:border-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"><HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.7} /></Link>;
  }
  return <details className="group relative min-h-20"><summary aria-label="Open customer account menu" className="grid min-h-20 min-w-12 cursor-pointer list-none place-items-center border-b border-transparent transition hover:border-[var(--aura-ivory)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aura-ivory)]"><HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.7} /></summary><div className="absolute right-0 top-full grid w-56 overflow-hidden rounded-[var(--aura-radius)] border border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)] p-2 shadow-2xl"><Link href="/account/orders" className="min-h-11 content-center rounded-sm px-3 font-display hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)]">Orders</Link><Link href="/account/delivery" className="min-h-11 content-center rounded-sm px-3 font-display hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)]">Delivery details</Link><Link href="/account/settings" className="min-h-11 content-center rounded-sm px-3 font-display hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)]">Settings</Link><button type="button" className="min-h-11 rounded-sm px-3 text-left font-display hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)]" onClick={signOut}>Sign out</button></div></details>;
}
