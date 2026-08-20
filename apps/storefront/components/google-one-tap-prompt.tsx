"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@perfume-aura/ui/components/button";
import { shouldOfferGoogleOneTap } from "@/lib/google-one-tap-policy";
import { GoogleSignInButton } from "./google-sign-in-button";

const promptAttemptedKey = "pa_customer_google_prompt_attempted";

export function GoogleOneTapPrompt({
  clientId,
}: Readonly<{
  clientId: string;
}>) {
  const pathname = usePathname();
  const offerGoogleSignIn = shouldOfferGoogleOneTap(pathname);
  const attempted = useRef(false);
  const [showFallback, setShowFallback] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!offerGoogleSignIn) return;

    const controller = new AbortController();
    void fetch("/api/customer-auth/get-session", {
      credentials: "same-origin",
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Customer session lookup failed");
        const value: unknown = await response.json();
        const sessionValue = value as { user?: unknown } | null;
        setSignedIn(Boolean(sessionValue?.user));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSignedIn(null);
      });

    return () => controller.abort();
  }, [offerGoogleSignIn]);

  useEffect(() => {
    if (
      signedIn !== false ||
      !offerGoogleSignIn ||
      attempted.current
    ) {
      return;
    }

    try {
      if (window.sessionStorage.getItem(promptAttemptedKey)) return;
      window.sessionStorage.setItem(promptAttemptedKey, "true");
    } catch {
      // Storage can be unavailable in privacy modes; the in-memory guard still
      // prevents repeat prompts for this mounted storefront session.
    }
    attempted.current = true;
    let active = true;
    void import("@/lib/customer-auth-client")
      .then(({ createCustomerGoogleAuthClient }) => {
        if (!active) return;
        return createCustomerGoogleAuthClient(clientId).oneTap({
          callbackURL: pathname,
          autoSelect: false,
          cancelOnTapOutside: true,
          onPromptNotification: () => {
            if (active) setShowFallback(true);
          },
        });
      })
      .catch(() => {
        if (active) setShowFallback(true);
      });

    return () => {
      active = false;
    };
  }, [clientId, offerGoogleSignIn, pathname, signedIn]);

  if (!offerGoogleSignIn || !showFallback || signedIn !== false) return null;

  return (
    <aside
      aria-label="Customer sign-in"
      className="fixed right-[var(--aura-gutter)] top-24 z-[45] w-[calc(100vw-2rem)] max-w-[21rem] rounded-[var(--aura-radius)] border border-[color:rgb(245_228_199_/_55%)] bg-[var(--aura-ink)] p-4 text-[var(--aura-ivory)] shadow-2xl lg:right-[var(--aura-gutter-lg)]"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Dismiss Google sign-in"
        className="absolute right-2 top-2 min-h-11 min-w-11 rounded-full text-[var(--aura-ivory)] hover:bg-[var(--aura-ivory)] hover:text-[var(--aura-ink)]"
        onClick={() => setShowFallback(false)}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
      </Button>
      <p className="pr-12 font-display text-2xl">Keep your order close.</p>
      <p className="mt-1 pr-8 text-sm leading-5 text-[color:rgb(245_228_199_/_72%)]">
        Continue with Google to view orders and return to checkout faster.
      </p>
      <div className="mt-4 overflow-hidden rounded-sm">
        <GoogleSignInButton clientId={clientId} callbackURL={pathname} />
      </div>
    </aside>
  );
}
