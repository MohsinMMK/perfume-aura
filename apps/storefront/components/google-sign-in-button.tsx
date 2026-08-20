"use client";

import { useEffect, useRef, useState } from "react";

export function GoogleSignInButton({
  clientId,
  callbackURL,
}: Readonly<{
  clientId: string;
  callbackURL: string;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    container.replaceChildren();
    void import("@/lib/customer-auth-client")
      .then(({ createCustomerGoogleAuthClient }) => {
        if (!active) return;
        return createCustomerGoogleAuthClient(clientId).oneTap({
          callbackURL,
          button: {
            container,
            config: {
              type: "standard",
              size: "large",
              theme: "filled_black",
              text: "continue_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: Math.min(400, Math.max(200, container.clientWidth)),
            },
          },
        });
      })
      .catch(() => {
        if (active) setError("Google sign-in is temporarily unavailable.");
      });

    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [callbackURL, clientId]);

  return (
    <div className="grid min-h-11 content-center">
      <div ref={containerRef} className="min-h-11" />
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
